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
        showTooltip(event, resp.summary, resp.cached);
      } else if (resp && resp.error) {
        showTooltip(event, "Error: " + resp.error, false);
      } else {
        showTooltip(event, "(no summary)", false);
      }
    });
  }

  // Show tooltip near cursor using a floating div
  function showTooltip(mouseEvent, text, isCached = false) {
    removeTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = "linkgist-tooltip";
    tooltipEl.style.position = "fixed";
    tooltipEl.style.zIndex = 2147483647;
    tooltipEl.style.maxWidth = "440px";
    tooltipEl.style.minWidth = "280px";
    tooltipEl.style.whiteSpace = "normal";
    tooltipEl.style.padding = "16px 18px";
    tooltipEl.style.borderRadius = "12px";
    tooltipEl.style.boxShadow = "0 12px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)";
    tooltipEl.style.background = "linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)";
    tooltipEl.style.backdropFilter = "blur(12px)";
    tooltipEl.style.color = "#cbd5e1";
    tooltipEl.style.fontSize = "14px";
    tooltipEl.style.lineHeight = "1.6";
    tooltipEl.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    tooltipEl.style.border = "1px solid rgba(148, 163, 184, 0.15)";
    tooltipEl.style.opacity = "0";
    tooltipEl.style.transform = "translateY(-8px)";
    tooltipEl.style.transition = "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)";

    // Header with icon and badge
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.gap = "8px";
    header.style.marginBottom = "12px";
    header.style.paddingBottom = "10px";
    header.style.borderBottom = "1px solid rgba(148, 163, 184, 0.1)";

    const icon = document.createElement("span");
    icon.innerHTML = "✨";
    icon.style.fontSize = "16px";
    
    const title = document.createElement("span");
    title.textContent = "LinkGist AI";
    title.style.fontWeight = "600";
    title.style.fontSize = "13px";
    title.style.color = "#94a3b8";
    title.style.letterSpacing = "0.5px";
    title.style.textTransform = "uppercase";
    title.style.flex = "1";

    if (isCached) {
      const badge = document.createElement("span");
      badge.textContent = "CACHED";
      badge.style.fontSize = "10px";
      badge.style.fontWeight = "700";
      badge.style.color = "#22d3ee";
      badge.style.background = "rgba(34, 211, 238, 0.15)";
      badge.style.padding = "3px 8px";
      badge.style.borderRadius = "6px";
      badge.style.letterSpacing = "0.5px";
      header.appendChild(badge);
    }

    header.appendChild(icon);
    header.appendChild(title);
    tooltipEl.appendChild(header);

    // Content
    const p = document.createElement("div");
    p.textContent = text;
    p.style.color = "#e4e4e7";
    tooltipEl.appendChild(p);

    // attach to body
    document.body.appendChild(tooltipEl);

    // Trigger animation
    requestAnimationFrame(() => {
      tooltipEl.style.opacity = "1";
      tooltipEl.style.transform = "translateY(0)";
    });

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
    const margin = 16;
    const rect = tooltipEl.getBoundingClientRect();
    let left = x + margin;
    let top = y + margin;
    
    // If off-screen on right
    if (left + rect.width > window.innerWidth - 12) {
      left = x - rect.width - margin;
    }
    // If off-screen bottom
    if (top + rect.height > window.innerHeight - 12) {
      top = y - rect.height - margin;
    }
    // Keep on screen left
    if (left < 12) left = 12;
    // Keep on screen top
    if (top < 12) top = 12;
    
    tooltipEl.style.left = left + "px";
    tooltipEl.style.top = top + "px";
  }

  function removeTooltip() {
    if (tooltipEl && tooltipEl.parentNode) {
      tooltipEl.style.opacity = "0";
      tooltipEl.style.transform = "translateY(-8px)";
      setTimeout(() => {
        if (tooltipEl && tooltipEl.parentNode) {
          tooltipEl.parentNode.removeChild(tooltipEl);
        }
        tooltipEl = null;
      }, 250);
    } else {
      tooltipEl = null;
    }
  }

  // Listen for background asking to show tooltip for stored summary
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "show_summary_tooltip") {
      const { summary } = message;
      showTooltip({ clientX: window.innerWidth / 2, clientY: 80 }, summary, false);
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
          // Our background isn't handling this – fallback query
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

  // Minimal CSS injection for tooltip animations
  const styleEl = document.createElement("style");
  styleEl.textContent = `
.linkgist-tooltip { 
  will-change: transform, opacity;
  pointer-events: none;
}
`;
  document.head && document.head.appendChild(styleEl);
})();
