document.addEventListener('DOMContentLoaded', () => {
  const startUrlInput = document.getElementById('startUrl');
  const urlInput = document.getElementById('url');
  const keywordTextarea = document.getElementById('keyword');
  const inputSelectorInput = document.getElementById('inputSelector');
  const submitSelectorInput = document.getElementById('submitSelector');
  const selectInputButton = document.getElementById('selectInputButton');
  const saveButton = document.getElementById('saveButton');
  const searchButton = document.getElementById('searchButton');
  const confirmStartUrlButton = document.getElementById('confirmStartUrl');

  // Load saved data
  chrome.storage.sync.get(['startUrl', 'url', 'keywords', 'inputSelector', 'submitSelector'], (data) => {
    startUrlInput.value = data.startUrl || '';
    urlInput.value = data.url || '';
    keywordTextarea.value = data.keywords ? data.keywords.join('\n') : '';
    inputSelectorInput.value = data.inputSelector || '';
    submitSelectorInput.value = data.submitSelector || '';
  });

  selectInputButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "startSelectMode"});
      }
    });
  });

  saveButton.addEventListener('click', () => {
    const keywords = keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    chrome.storage.sync.set({
      startUrl: startUrlInput.value,
      url: urlInput.value,
      keywords: keywords,
      inputSelector: inputSelectorInput.value,
      submitSelector: submitSelectorInput.value
    }, () => {
      alert('Settings saved!');
    });
  });

  searchButton.addEventListener('click', () => {
    const keywords = keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    chrome.runtime.sendMessage({
      action: 'performSearch',
      startUrl: startUrlInput.value,
      url: urlInput.value,
      keywords: keywords,
      inputSelector: inputSelectorInput.value,
      submitSelector: submitSelectorInput.value
    });
  });

  confirmStartUrlButton.addEventListener('click', () => {
    const startUrl = startUrlInput.value.trim();
    if (startUrl) {
      chrome.runtime.sendMessage({
        action: 'openStartUrl',
        startUrl: startUrl
      });
      window.close(); // Close the popup after confirming
    } else {
      alert('Please enter a valid starting URL');
    }
  });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup received message:', request);
  if (request.action === "inputSelected") {
    document.getElementById('inputSelector').value = request.selector;
    alert('Input field selected: ' + request.selector);
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (key === 'inputSelector') {
      document.getElementById('inputSelector').value = newValue;
    }
  }
});