// Slopwash Browser Extension — Popup Script
// Scaffolding — handles the popup UI interactions.

const inputEl = document.getElementById("input") as HTMLTextAreaElement;
const scanBtn = document.getElementById("scan") as HTMLButtonElement;
const resultEl = document.getElementById("result") as HTMLDivElement;

// Try to load any selected text from the page
chrome.storage.local.get("selectedText", (data) => {
  if (data.selectedText) {
    inputEl.value = data.selectedText;
    chrome.storage.local.remove("selectedText");
  }
});

scanBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  if (!text) return;

  resultEl.textContent = "Scanning...";
  resultEl.className = "";

  // Send to content script for analysis
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (!tabId) {
      resultEl.textContent = "No active tab";
      return;
    }

    chrome.tabs.sendMessage(
      tabId,
      { type: "SLOPWASH_SCAN", text },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          // Fallback: show word count only (content script not available)
          const words = text.split(/\s+/).filter(Boolean).length;
          resultEl.innerHTML = `<div class="placeholder">${words} words — analyzer not loaded on this page</div>`;
          return;
        }

        const scoreClass =
          response.score >= 80
            ? "good"
            : response.score >= 50
              ? "ok"
              : "bad";
        resultEl.innerHTML = `
          <div class="score ${scoreClass}">${response.score}/100</div>
          <div class="info">${response.wordCount} words · ${response.violationCount} violations</div>
        `;
      }
    );
  });
});
