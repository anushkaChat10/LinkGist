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
    if (u) {
      urlInput.value = u;
      // Check if we have cached summary
      chrome.runtime.sendMessage({ action: "get_cached_summary", url: u }, (resp) => {
        if (resp && resp.ok && resp.summary) {
          summaryText.textContent = resp.summary;
          setStatus("✓ Loaded from cache", "success");
        }
      });
    }
  });

  summarizeBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) {
      setStatus("⚠ Please enter a URL", "warning");
      return;
    }
    
    clearAnswer();
    setButtonLoading(summarizeBtn, true);
    setStatus("🔄 Fetching and analyzing content...", "loading");
    
    try {
      chrome.runtime.sendMessage({ action: "popup_summarize_url", url }, (resp) => {
        setButtonLoading(summarizeBtn, false);
        
        if (!resp) {
          setStatus("❌ No response from background service", "error");
          return;
        }
        
        if (resp.ok) {
          summaryText.textContent = resp.summary || "(no summary generated)";
          if (resp.cached) {
            setStatus("✓ Summary loaded from cache", "success");
          } else {
            setStatus("✓ Summary generated successfully", "success");
          }
          
          // Fade in animation
          summaryText.style.opacity = "0";
          summaryText.style.transform = "translateY(-5px)";
          setTimeout(() => {
            summaryText.style.transition = "all 0.3s ease";
            summaryText.style.opacity = "1";
            summaryText.style.transform = "translateY(0)";
          }, 50);
        } else {
          summaryText.textContent = "Failed to generate summary.";
          setStatus("❌ " + (resp.error || "Unknown error occurred"), "error");
        }
      });
    } catch (err) {
      setButtonLoading(summarizeBtn, false);
      setStatus("❌ Error: " + err.message, "error");
    }
  });

  fetchFromTabBtn.addEventListener("click", async () => {
    const u = await fetchCurrentTabUrl();
    if (u) {
      urlInput.value = u;
      setStatus("✓ URL loaded from current tab", "success");
      
      // Check cache
      chrome.runtime.sendMessage({ action: "get_cached_summary", url: u }, (resp) => {
        if (resp && resp.ok && resp.summary) {
          summaryText.textContent = resp.summary;
          setStatus("✓ Cached summary available", "success");
        }
      });
    } else {
      setStatus("⚠ Could not get URL from current tab", "warning");
    }
  });

  askBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    const q = questionInput.value.trim();
    
    if (!url) {
      setStatus("⚠ Please provide a URL first", "warning");
      return;
    }
    
    if (!q) {
      setStatus("⚠ Please type a question", "warning");
      questionInput.focus();
      return;
    }
    
    setButtonLoading(askBtn, true);
    setStatus("🤔 Processing your question...", "loading");
    clearAnswer();
    
    chrome.runtime.sendMessage({ action: "popup_ask_question", url, question: q }, (resp) => {
      setButtonLoading(askBtn, false);
      
      if (!resp) {
        setStatus("❌ No response from background service", "error");
        return;
      }
      
      if (resp.ok) {
        answerBox.textContent = resp.answer || "(no answer generated)";
        answerBox.style.display = "block";
        setStatus("✓ Answer generated", "success");
        
        // Fade in animation
        answerBox.style.opacity = "0";
        answerBox.style.transform = "translateY(-5px)";
        setTimeout(() => {
          answerBox.style.transition = "all 0.3s ease";
          answerBox.style.opacity = "1";
          answerBox.style.transform = "translateY(0)";
        }, 50);
      } else {
        if (resp.error && resp.error.includes("No stored context")) {
          setStatus("⚠ Please summarize the URL first", "warning");
        } else {
          setStatus("❌ " + (resp.error || "Unknown error"), "error");
        }
      }
    });
  });

  // Enter key support
  urlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") summarizeBtn.click();
  });

  questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") askBtn.click();
  });

  function setStatus(txt, type = "info") {
    status.textContent = txt || "";
    status.className = "status";
    
    if (type === "success") {
      status.style.color = "#86efac";
      status.style.background = "rgba(34, 197, 94, 0.15)";
    } else if (type === "error") {
      status.style.color = "#fca5a5";
      status.style.background = "rgba(239, 68, 68, 0.15)";
    } else if (type === "warning") {
      status.style.color = "#fcd34d";
      status.style.background = "rgba(245, 158, 11, 0.15)";
    } else if (type === "loading") {
      status.style.color = "#a5b4fc";
      status.style.background = "rgba(99, 102, 241, 0.15)";
    } else {
      status.style.color = "#94a3b8";
      status.style.background = "rgba(15, 23, 42, 0.4)";
    }
    
    status.style.display = txt ? "block" : "none";
    
    // Auto-clear success messages
    if (type === "success") {
      setTimeout(() => {
        if (status.textContent === txt) {
          status.style.opacity = "0";
          setTimeout(() => {
            status.style.display = "none";
            status.style.opacity = "1";
          }, 300);
        }
      }, 3000);
    }
  }

  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.classList.add("loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  function clearAnswer() {
    answerBox.textContent = "";
    answerBox.style.display = "none";
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
