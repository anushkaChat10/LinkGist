// background.js
// Service worker background script for LinkGist AI.
// Replace <YOUR_HF_API_KEY> with your Hugging Face API key.

const HF_API_KEY = "<YOUR API KEY>";
const HF_SUMMARY_MODEL = "facebook/bart-large-cnn";
const HF_QA_MODEL = "google/flan-t5-base";

const SUMMARY_CACHE_KEY = "linkgist_cache_v1"; // chrome.storage.local: { url: { summary, text, ts } }

async function getCache() {
  return new Promise((res) => {
    chrome.storage.local.get([SUMMARY_CACHE_KEY], (items) => {
      res(items[SUMMARY_CACHE_KEY] || {});
    });
  });
}

async function setCache(cache) {
  return new Promise((res) => {
    const payload = {};
    payload[SUMMARY_CACHE_KEY] = cache;
    chrome.storage.local.set(payload, () => res());
  });
}

async function fetchHTML(url) {
  try {
    const resp = await fetch(url, { method: "GET", mode: "cors" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    return text;
  } catch (err) {
    console.warn("fetchHTML failed:", err);
    throw err;
  }
}

async function callHfModel(model, inputs) {
  const url = `https://api-inference.huggingface.co/models/${model}`;
  const body = JSON.stringify({ inputs });
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HF API error: ${resp.status} ${text}`);
  }
  const json = await resp.json();
  return json;
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Use asynchronous response
  (async () => {
    try {
      if (message.action === "summarize_url_hover") {
        // message: { action, url, tabId }
        const { url, tabId } = message;
        const cache = await getCache();
        if (cache[url] && cache[url].summary) {
          sendResponse({ ok: true, summary: cache[url].summary, cached: true });
          return;
        }

        // Fetch HTML
        let html;
        try {
          html = await fetchHTML(url);
        } catch (err) {
          sendResponse({ ok: false, error: "Failed to fetch URL: " + err.message });
          return;
        }

        // Ask the tab's content script to clean/strip HTML into plaintext
        const tabToReply = tabId || (sender && sender.tab && sender.tab.id);
        if (!tabToReply) {
          // fallback: attempt to extract text in service worker (simple)
          const cleaned = stripHtmlToText(html);
          // call summary
          const summary = await summarizeText(cleaned);
          // cache & respond
          cache[url] = { summary, text: cleaned, ts: Date.now() };
          await setCache(cache);
          sendResponse({ ok: true, summary, cached: false });
          return;
        }

        // Send to content script to clean HTML
        chrome.tabs.sendMessage(tabToReply, { action: "clean_html", html }, async (resp) => {
          try {
            const cleanedText = (resp && resp.text) ? resp.text : stripHtmlToText(html);
            // Check storage again (in case of race)
            const cache2 = await getCache();
            if (cache2[url] && cache2[url].summary) {
              sendResponse({ ok: true, summary: cache2[url].summary, cached: true });
              return;
            }

            const summary = await summarizeText(cleanedText);
            cache2[url] = { summary, text: cleanedText, ts: Date.now() };
            await setCache(cache2);

            // Send summary back to content script to display tooltip
            chrome.tabs.sendMessage(tabToReply, { action: "show_summary_tooltip", url, summary });

            sendResponse({ ok: true, summary, cached: false });
          } catch (err) {
            console.error("Error processing cleaned html:", err);
            sendResponse({ ok: false, error: err.message || String(err) });
          }
        });

        // Must return true to indicate we'll send response asynchronously
        return true;
      } else if (message.action === "popup_summarize_url") {
        const { url } = message;
        // Validate URL
        if (!url || typeof url !== "string") {
          sendResponse({ ok: false, error: "Invalid URL" });
          return;
        }

        const cache = await getCache();
        if (cache[url] && cache[url].summary) {
          sendResponse({ ok: true, summary: cache[url].summary, cached: true });
          return;
        }

        // Try to fetch and process directly in service worker
        const html = await fetchHTML(url);
        // Attempt to proxy cleaning to the active tab's content script for better parsing
        // Find an active tab for this origin:
        let tabs = await new Promise((res) => {
          chrome.tabs.query({ active: true, currentWindow: true }, res);
        });
        const tabId = tabs && tabs[0] && tabs[0].id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: "clean_html", html }, async (resp) => {
            const cleanedText = (resp && resp.text) ? resp.text : stripHtmlToText(html);
            const summary = await summarizeText(cleanedText);
            const cache2 = await getCache();
            cache2[url] = { summary, text: cleanedText, ts: Date.now() };
            await setCache(cache2);
            sendResponse({ ok: true, summary });
          });
          return true;
        } else {
          // Fallback
          const cleaned = stripHtmlToText(html);
          const summary = await summarizeText(cleaned);
          cache[url] = { summary, text: cleaned, ts: Date.now() };
          await setCache(cache);
          sendResponse({ ok: true, summary });
          return;
        }
      } else if (message.action === "popup_ask_question") {
        const { url, question } = message;
        if (!url || !question) {
          sendResponse({ ok: false, error: "Missing url or question" });
          return;
        }

        const cache = await getCache();
        if (!cache[url] || !cache[url].text) {
          sendResponse({ ok: false, error: "No stored context for this URL. Please summarize it first." });
          return;
        }

        const contextText = cache[url].text;
        const prompt = `Context: ${contextText}\nQuestion: ${question}\nAnswer:`;

        // Call HF model for generative answer
        const result = await callHfModel(HF_QA_MODEL, prompt);
        // HF generative outputs can vary: sometimes a string, sometimes array of objects
        const answer = parseHfGenerated(result);

        sendResponse({ ok: true, answer });
        return;
      } else if (message.action === "get_cached_summary") {
        const { url } = message;
        const cache = await getCache();
        if (cache[url] && cache[url].summary) {
          sendResponse({ ok: true, summary: cache[url].summary, text: cache[url].text, ts: cache[url].ts });
        } else {
          sendResponse({ ok: false });
        }
        return;
      } else {
        sendResponse({ ok: false, error: "Unknown action" });
      }
    } catch (err) {
      console.error("background message handler error:", err);
      sendResponse({ ok: false, error: err.message || String(err) });
    }
  })();

  // Indicate asynchronous response
  return true;
});

// Helpers

function stripHtmlToText(html) {
  try {
    // Basic approach: remove scripts/styles and tags, decode common entities
    // This is a fallback for environments where DOMParser isn't available.
    let text = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ");
    text = text.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ");
    text = text.replace(/<\/?[^>]+(>|$)/g, " "); // remove tags
    text = text.replace(/\s+/g, " ").trim();
    // decode some entities
    text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    if (text.length > 20000) text = text.slice(0, 20000); // safety trim
    return text;
  } catch (err) {
    console.warn("stripHtmlToText error:", err);
    return "";
  }
}

async function summarizeText(text) {
  // Limit text size to avoid exceeding model input limits
  const maxLen = 15000;
  let t = text;
  if (t.length > maxLen) {
    t = t.slice(0, maxLen);
  }

  const resp = await callHfModel(HF_SUMMARY_MODEL, t);
  // Parse response
  // Response might be { summary_text: "..."} or [{summary_text: "..."}] or [{generated_text: "..."}]
  let summary = "";
  if (Array.isArray(resp)) {
    const first = resp[0];
    if (first.summary_text) summary = first.summary_text;
    else if (first.generated_text) summary = first.generated_text;
    else if (typeof first === "string") summary = first;
    else summary = JSON.stringify(first).slice(0, 2000);
  } else if (resp.summary_text) {
    summary = resp.summary_text;
  } else if (typeof resp === "string") {
    summary = resp;
  } else {
    summary = JSON.stringify(resp).slice(0, 2000);
  }
  if (!summary) summary = "(no summary returned)";
  return summary;
}

function parseHfGenerated(resp) {
  if (!resp) return "";
  if (Array.isArray(resp)) {
    const first = resp[0];
    if (typeof first === "string") return first;
    if (first.generated_text) return first.generated_text;
    // fallback: try to join text fields
    return Object.values(first).join(" ");
  }
  if (typeof resp === "string") return resp;
  if (resp.generated_text) return resp.generated_text;
  return JSON.stringify(resp);
}
