document.addEventListener('DOMContentLoaded', () => {
  const urlInput = document.getElementById('url');
  const keywordTextarea = document.getElementById('keyword');
  const inputSelectorInput = document.getElementById('inputSelector');
  const submitSelectorInput = document.getElementById('submitSelector');
  const selectInputButton = document.getElementById('selectInputButton');
  const saveButton = document.getElementById('saveButton');
  const searchButton = document.getElementById('searchButton');

  // Get current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const currentUrl = tabs[0].url;
    
    // Load saved data
    chrome.storage.sync.get(['url', 'keywords', 'inputSelector', 'submitSelector'], (data) => {
      urlInput.value = data.url || currentUrl;
      keywordTextarea.value = data.keywords ? data.keywords.join('\n') : '';
      inputSelectorInput.value = data.inputSelector || '';
      submitSelectorInput.value = data.submitSelector || '';
    });
  });

  selectInputButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "startSelectMode"});
    });
    window.close(); // Close the popup after initiating select mode
  });

  saveButton.addEventListener('click', () => {
    const keywords = keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    chrome.storage.sync.set({
      url: urlInput.value,
      keywords: keywords,
      inputSelector: inputSelectorInput.value,
      submitSelector: submitSelectorInput.value
    });
  });

  searchButton.addEventListener('click', () => {
    const keywords = keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    chrome.runtime.sendMessage({
      action: 'performSearch',
      url: urlInput.value,
      keywords: keywords,
      inputSelector: inputSelectorInput.value,
      submitSelector: submitSelectorInput.value
    });
    window.close(); // Close the popup after initiating the search
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "inputSelected") {
    document.getElementById('inputSelector').value = request.selector;
  }
});