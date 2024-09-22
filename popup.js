document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    startUrlInput: document.getElementById('startUrl'),
    keywordTextarea: document.getElementById('keyword'),
    inputSelectorInput: document.getElementById('inputSelector'),
    submitSelectorInput: document.getElementById('submitSelector'),
    useEnterToSubmitCheckbox: document.getElementById('useEnterToSubmit'),
    reselectInputButton: document.getElementById('reselectInputButton'),
    saveButton: document.getElementById('saveButton'),
    searchButton: document.getElementById('searchButton'),
    confirmStartUrlButton: document.getElementById('confirmStartUrl')
  };

  // Check if all elements are present
  const allElementsPresent = Object.values(elements).every(element => element !== null);

  if (!allElementsPresent) {
    console.error('Some elements are missing from the DOM');
    return; // Exit the function if any element is missing
  }

  // Load saved data
  chrome.storage.sync.get(['startUrl', 'keywords', 'inputSelector', 'submitSelector', 'useEnterToSubmit'], (data) => {
    elements.startUrlInput.value = data.startUrl || '';
    elements.keywordTextarea.value = data.keywords ? data.keywords.join('\n') : '';
    elements.inputSelectorInput.value = data.inputSelector || '';
    elements.submitSelectorInput.value = data.submitSelector || '';
    elements.useEnterToSubmitCheckbox.checked = data.useEnterToSubmit || false;
  });

  elements.reselectInputButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "startSelectMode"});
      }
    });
  });

  elements.saveButton.addEventListener('click', () => {
    const keywords = elements.keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    chrome.storage.sync.set({
      startUrl: elements.startUrlInput.value,
      keywords: keywords,
      inputSelector: elements.inputSelectorInput.value,
      submitSelector: elements.submitSelectorInput.value,
      useEnterToSubmit: elements.useEnterToSubmitCheckbox.checked
    }, () => {
      alert('Settings saved!');
    });
  });

  elements.searchButton.addEventListener('click', () => {
    const keywords = elements.keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    if (keywords.length === 0) {
      alert('Please enter at least one keyword');
      return;
    }
    chrome.runtime.sendMessage({
      action: 'performSearch',
      startUrl: elements.startUrlInput.value,
      keywords: keywords,
      inputSelector: elements.inputSelectorInput.value,
      submitSelector: elements.submitSelectorInput.value,
      useEnterToSubmit: elements.useEnterToSubmitCheckbox.checked
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('Search message sent successfully');
      }
    });
  });

  elements.confirmStartUrlButton.addEventListener('click', () => {
    const startUrl = elements.startUrlInput.value.trim();
    if (startUrl) {
      chrome.runtime.sendMessage({
        action: 'openStartUrl',
        startUrl: startUrl
      }, (response) => {
        if (response && response.success) {
          alert('Starting URL opened in a new tab. Please select an input field on the opened page.');
          chrome.runtime.sendMessage({ action: 'startSelectMode' });
        } else {
          alert('Failed to open starting URL');
        }
      });
    } else {
      alert('Please enter a valid starting URL');
    }
  });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup received message:', request);
  if (request.action === "inputSelected") {
    const inputSelectorInput = document.getElementById('inputSelector');
    if (inputSelectorInput) {
      inputSelectorInput.value = request.selector;
      alert('Input field selected: ' + request.selector);
    }
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (key === 'inputSelector') {
      const inputSelectorInput = document.getElementById('inputSelector');
      if (inputSelectorInput) {
        inputSelectorInput.value = newValue;
      }
    }
  }
});