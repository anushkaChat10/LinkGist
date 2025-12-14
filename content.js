// content.js
// Runs in page context. Detects link hovers, injects tooltip, cleans HTML (when asked by background).

(() => {
  const HOVER_DELAY = 600; // ms before sending request
  let hoverTimer = null;
  let lastLink = null;
  let tooltipEl = null;

  // Attach mouseover/mouseout listeners at document level (capture)
  document.addEventListener("mouseover", onMouseOver, true);
  document.addEventListener("mouseout", onMouseOut, true);

  function onMouseOver(e) {
    const link = findLinkElement(e.target);
    if (!link) return;
    lastLink = link;

    // set timer so quick movements don't create requests
    hoverTimer = setTimeout(() => {
      handleLinkHover(link, e);
    }, HOVER_DELAY);
  }

  function onMouseOut(e) {
    const related = e.relatedTarget;
    const leavingLink = findLinkElement(e.target);
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    // If leaving the link, remove any tooltip
    if (leavingLink) {
      removeTooltip();
    }
  }

  function findLinkElement(node) {
    while (node) {
      if (node.tagName && node.tagName.toLowerCase() === "a" && node.href) return node;
      node = node.parentElement;
    }
    return null;
  }

  async function handleLinkHover(link, event) {
    const url = link.href;
    const tab = await getMyTabId(); // not strictly needed
    // ask background to summarize
    chrome.runtime.sendMessage({ action: "summarize_url_hover", url, tabId: tab }, (resp) => {
      if (!resp) return;
      if (resp.ok && resp.summary) {
        showTooltip(event, resp.summary);
      } else if (resp && resp.error) {
        showTooltip(event, "Error: " + resp.error);
      } else {
        showTooltip(event, "(no summary)");
      }
    });
  }

  // Show tooltip near cursor using a floating div
  function showTooltip(mouseEvent, text) {
    removeTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = "linkgist-tooltip";
    tooltipEl.style.position = "fixed";
    tooltipEl.style.zIndex = 2147483647;
    tooltipEl.style.maxWidth = "420px";
    tooltipEl.style.whiteSpace = "normal";
    tooltipEl.style.padding = "10px";
    tooltipEl.style.borderRadius = "8px";
    tooltipEl.style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";
    tooltipEl.style.background = "linear-gradient(180deg, #ffffff, #f6f9ff)";
    tooltipEl.style.color = "#111";
    tooltipEl.style.fontSize = "13px";
    tooltipEl.style.lineHeight = "1.4";
    tooltipEl.style.fontFamily = "Segoe UI, Roboto, Arial, sans-serif";
    tooltipEl.style.border = "1px solid rgba(0,0,0,0.06)";

    // content
    const p = document.createElement("div");
    p.textContent = text;
    tooltipEl.appendChild(p);

    // attach to body
    document.body.appendChild(tooltipEl);

    positionTooltip(mouseEvent.clientX, mouseEvent.clientY);
    // Update position with mouse move while tooltip is visible
    function moveHandler(e) {
      positionTooltip(e.clientX, e.clientY);
    }
    document.addEventListener("mousemove", moveHandler);
    // Remove after 8s or when link moves away
    setTimeout(() => {
      document.removeEventListener("mousemove", moveHandler);
      removeTooltip();
    }, 8000);
  }

  function positionTooltip(x, y) {
    if (!tooltipEl) return;
    const margin = 12;
    const rect = tooltipEl.getBoundingClientRect();
    let left = x + margin;
    let top = y + margin;
    // If off-screen on right
    if (left + rect.width > window.innerWidth - 8) {
      left = x - rect.width - margin;
    }
    // If off-screen bottom
    if (top + rect.height > window.innerHeight - 8) {
      top = y - rect.height - margin;
    }
    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
  }

  function removeTooltip() {
    if (tooltipEl && tooltipEl.parentNode) {
      tooltipEl.parentNode.removeChild(tooltipEl);
    }
    tooltipEl = null;
  }

  // Listen for background asking to show tooltip for stored summary
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "show_summary_tooltip") {
      const { summary } = message;
      showTooltip({ clientX: window.innerWidth / 2, clientY: 80 }, summary);
    } else if (message.action === "clean_html") {
      // message: { action: 'clean_html', html }
      const cleaned = cleanAndExtractText(message.html);
      sendResponse({ text: cleaned });
    }
    // Return true if async; we are sending response synchronously
  });

  function cleanAndExtractText(html) {
    try {
      // Use DOMParser in page context for best results
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      // Remove script and style
      const scripts = doc.querySelectorAll("script, style, noscript, iframe");
      scripts.forEach((n) => n.remove());
      // Extract visible text
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
        acceptNode: function(node) {
          // ignore empty or whitespace-only nodes
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          // ignore nodes in hidden elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_ACCEPT;
          const style = window.getComputedStyle(parent);
          if (style && (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });

      let textParts = [];
      let node;
      while ((node = walker.nextNode())) {
        const trimmed = node.nodeValue.replace(/\s+/g, " ").trim();
        if (trimmed) textParts.push(trimmed);
        if (textParts.join(" ").length > 20000) break; // safety limit
      }
      const text = textParts.join("\n").slice(0, 20000);
      return text;
    } catch (err) {
      // fallback naive approach
      const tmp = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ");
      const noTags = tmp.replace(/<\/?[^>]+(>|$)/g, " ");
      return noTags.replace(/\s+/g, " ").trim().slice(0, 20000);
    }
  }

  // Utility to get current tab id (best-effort)
  function getMyTabId() {
    return new Promise((res) => {
      try {
        chrome.runtime.sendMessage({ action: "get_tab_id_request" }, (reply) => {
          // Our background isn't handling this — fallback query
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            res((tabs && tabs[0] && tabs[0].id) || null);
          });
        });
      } catch (e) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          res((tabs && tabs[0] && tabs[0].id) || null);
        });
      }
    });
  }

  // Minimal CSS injection for tooltip (in case user wants to override)
  const styleEl = document.createElement("style");
  styleEl.textContent = `
.linkgist-tooltip { transition: transform 0.12s ease, opacity 0.12s ease; transform-origin: top left; opacity: 1; }
`;
  document.head && document.head.appendChild(styleEl);
})();
