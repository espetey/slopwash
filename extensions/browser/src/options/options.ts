// Slopwash Browser Extension — Options Script

const modelSelect = document.getElementById("model") as HTMLSelectElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;
const savedMsg = document.getElementById("saved") as HTMLParagraphElement;

// Load saved options
chrome.storage.sync.get("model", (data) => {
  if (data.model) {
    modelSelect.value = data.model;
  }
});

saveBtn.addEventListener("click", () => {
  chrome.storage.sync.set({ model: modelSelect.value }, () => {
    savedMsg.style.display = "block";
    setTimeout(() => {
      savedMsg.style.display = "none";
    }, 2000);
  });
});
