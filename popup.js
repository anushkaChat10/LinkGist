// popup.js
// Handles popup UI, sending messages to background, showing results

document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("urlInput");
  const summarizeBtn = document.getElementById("summarizeBtn");
  const fetchFromTabBtn = document.getElementById("fetchFromTabBtn");
  const summaryText = document.getElementById("summaryText");
  const status = document.getElementById("status");
  const questionInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const answerBox = document.getElementById("answerBox");

  // Fill URL with current tab's URL by default
  fetchCurrentTabUrl().then((u) => {
    if (u) urlInput.value = u;
  });

  summarizeBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus("Enter a URL to summarize.");
      return;
    }
    clearAnswer();
    setStatus("Summarizing...");
    try {
      chrome.runtime.sendMessage({ action: "popup_summarize_url", url }, (resp) => {
        if (!resp) {
          setStatus("No response from background.");
          return;
        }
        if (resp.ok) {
          summaryText.textContent = resp.summary || "(no summary)";
          setStatus(resp.cached ? "Loaded from cache." : "Summary ready.");
        } else {
          setStatus("Error: " + (resp.error || "unknown"));
        }
      });
    } catch (err) {
      setStatus("Error: " + err.message);
    }
  });

  fetchFromTabBtn.addEventListener("click", async () => {
    const u = await fetchCurrentTabUrl();
    if (u) urlInput.value = u;
  });

  askBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    const q = questionInput.value.trim();
    if (!url) {
      setStatus("Provide URL first (summarize it first if needed).");
      return;
    }
    if (!q) {
      setStatus("Type a question.");
      return;
    }
    setStatus("Asking question...");
    clearAnswer();
    chrome.runtime.sendMessage({ action: "popup_ask_question", url, question: q }, (resp) => {
      if (!resp) {
        setStatus("No response from background.");
        return;
      }
      if (resp.ok) {
        answerBox.textContent = resp.answer || "(no answer)";
        setStatus("Answer ready.");
      } else {
        setStatus("Error: " + (resp.error || "unknown"));
      }
    });
  });

  function setStatus(txt) {
    status.textContent = txt || "";
  }
  function clearAnswer() {
    answerBox.textContent = "";
  }
  async function fetchCurrentTabUrl() {
    return new Promise((res) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs[0]) return res("");
        res(tabs[0].url || "");
      });
    });
  }
});
