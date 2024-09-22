document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    startUrlInput: document.getElementById('startUrl'),
    keywordTextarea: document.getElementById('keyword'),
    inputSelectorInput: document.getElementById('inputSelector'),
    submitSelectorInput: document.getElementById('submitSelector'),
    outputSelectorInput: document.getElementById('outputSelector'),
    useEnterToSubmitCheckbox: document.getElementById('useEnterToSubmit'),
    reselectInputButton: document.getElementById('reselectInputButton'),
    reselectSubmitButton: document.getElementById('reselectSubmitButton'),
    reselectOutputButton: document.getElementById('reselectOutputButton'),
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
  chrome.storage.sync.get(['startUrl', 'keywords', 'inputSelector', 'submitSelector', 'outputSelector', 'useEnterToSubmit'], (data) => {
    elements.startUrlInput.value = data.startUrl || '';
    elements.keywordTextarea.value = data.keywords ? data.keywords.join('\n') : '';
    elements.inputSelectorInput.value = data.inputSelector || '';
    elements.submitSelectorInput.value = data.submitSelector || '';
    elements.outputSelectorInput.value = data.outputSelector || '';
    elements.useEnterToSubmitCheckbox.checked = data.useEnterToSubmit || false;
  });

  // Add this function at the beginning of your file
  function getDomain(url) {
    let domain;
    // Remove protocol and get domain
    if (url.indexOf("://") > -1) {
      domain = url.split('/')[2];
    } else {
      domain = url.split('/')[0];
    }
    // Remove port number if exists
    domain = domain.split(':')[0];
    return domain;
  }

  elements.reselectInputButton.addEventListener('click', () => {
    const startUrl = elements.startUrlInput.value.trim();
    if (!startUrl) {
      alert('Please enter a starting URL first.');
      return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        // Focus on the current tab in the main browser window
        chrome.windows.update(tabs[0].windowId, { focused: true }, () => {
          chrome.tabs.update(tabs[0].id, { active: true }, () => {
            // After focusing, proceed with the select mode
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              function: () => {
                return true;
              }
            }, (injectionResults) => {
              if (chrome.runtime.lastError) {
                console.error('Script injection failed:', chrome.runtime.lastError);
                alert('Error: Unable to interact with this page. Please make sure you\'re on a valid web page.');
                return;
              }
              
              console.log('Sending startSelectMode message to tab:', tabs[0].id);
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "startSelectMode",
                mode: "input field",
                startUrl: startUrl
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('Error:', chrome.runtime.lastError);
                  alert('Error: Unable to communicate with the page. Please refresh the page and try again.');
                } else if (response && response.success) {
                  console.log('Select mode started successfully');
                  alert('Select mode started. Please click on the input field you want to use.');
                } else {
                  console.error('Failed to start select mode. Response:', response);
                  alert('Error: Failed to start select mode. Please check the console for more details.');
                }
              });
            });
          });
        });
      } else {
        alert('Error: Unable to access the current tab.');
      }
    });
  });

  elements.reselectSubmitButton.addEventListener('click', () => {
    const startUrl = elements.startUrlInput.value.trim();
    if (!startUrl) {
      alert('Please enter a starting URL first.');
      return;
    }

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        const currentUrl = tabs[0].url;
        console.log('Current URL:', currentUrl);
        console.log('Start URL:', startUrl);
        
        if (currentUrl.includes(startUrl)) {
          chrome.tabs.sendMessage(tabs[0].id, {action: "startSelectMode", mode: "submit element"});
        } else {
          alert(`Error: The current page does not match the starting URL. Please navigate to the correct page first.`);
        }
      } else {
        alert('Error: Unable to access the current tab.');
      }
    });
  });

  elements.reselectOutputButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "startSelectMode", mode: "output div"});
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
      outputSelector: elements.outputSelectorInput.value,
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
      outputSelector: elements.outputSelectorInput.value,
      useEnterToSubmit: elements.useEnterToSubmitCheckbox.checked
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError.message);
        alert(`Error performing search: ${chrome.runtime.lastError.message}`);
      } else {
        console.log('Search message sent successfully', response);
        alert('Search initiated. Results will be displayed here.');
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
          alert('Starting URL opened in a new tab.');
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
  } else if (request.action === "submitSelected") {
    const submitSelectorInput = document.getElementById('submitSelector');
    if (submitSelectorInput) {
      submitSelectorInput.value = request.selector;
      alert('Submit element selected: ' + request.selector);
    }
  } else if (request.action === "outputSelected") {
    const outputSelectorInput = document.getElementById('outputSelector');
    if (outputSelectorInput) {
      outputSelectorInput.value = request.selector;
      alert('Output div selected: ' + request.selector);
    }
  } else if (request.action === "searchResult") {
    const resultDiv = document.getElementById('searchResults');
    if (resultDiv) {
      resultDiv.innerHTML += `<h3>${request.keyword}</h3><p>${request.result}</p>`;
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
    } else if (key === 'submitSelector') {
      const submitSelectorInput = document.getElementById('submitSelector');
      if (submitSelectorInput) {
        submitSelectorInput.value = newValue;
      }
    } else if (key === 'outputSelector') {
      const outputSelectorInput = document.getElementById('outputSelector');
      if (outputSelectorInput) {
        outputSelectorInput.value = newValue;
      }
    }
  }
});