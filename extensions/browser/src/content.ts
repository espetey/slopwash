// Slopwash Browser Extension — Content Script
// Scaffolding — depends on the `slopwash` npm package being bundled into the extension.
//
// This content script scans selected text on any webpage for AI writing patterns.
// It communicates with the popup via chrome.runtime messaging.

// import { analyze } from "slopwash";

interface ScanRequest {
  type: "SLOPWASH_SCAN";
  text: string;
  model?: string;
}

interface ScanResponse {
  type: "SLOPWASH_RESULT";
  score: number;
  violationCount: number;
  wordCount: number;
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
  (
    message: ScanRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ScanResponse) => void
  ) => {
    if (message.type === "SLOPWASH_SCAN") {
      // TODO: uncomment when slopwash is bundled
      // const result = analyze(message.text, message.model ? { model: message.model } : undefined);
      // sendResponse({
      //   type: "SLOPWASH_RESULT",
      //   score: result.score,
      //   violationCount: result.violations.length,
      //   wordCount: result.wordCount,
      // });

      sendResponse({
        type: "SLOPWASH_RESULT",
        score: 0,
        violationCount: 0,
        wordCount: message.text.split(/\s+/).filter(Boolean).length,
      });
    }
    return true; // keep message channel open for async response
  }
);

// Optionally scan selected text on right-click (requires contextMenus permission)
document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 50) {
    // Store the selected text so the popup can access it
    chrome.storage.local.set({ selectedText: selection.toString().trim() });
  }
});
