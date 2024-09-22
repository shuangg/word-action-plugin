function resizeSidepanel(width, height) {
  chrome.windows.getCurrent({}, (window) => {
    chrome.windows.update(window.id, {
      width: width,
      height: height
    });
  });
}

// Call this function when needed, e.g.:
// resizeSidepanel(400, 600);

document.addEventListener('DOMContentLoaded', function() {
  // ... (keep any existing code here)

  // Add this new code for handling the starting URL
  const startUrlInput = document.getElementById('startUrl');
  const confirmStartUrlButton = document.getElementById('confirmStartUrl');

  confirmStartUrlButton.addEventListener('click', function() {
    let startUrl = startUrlInput.value.trim();
    if (!startUrl) {
      // If no URL is entered, get the current tab's URL
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url) {
          startUrl = tabs[0].url;
          startUrlInput.value = startUrl; // Update the input field with the current URL
        } else {
          console.error('Unable to get current tab URL');
          // You might want to show an error message to the user
          return;
        }
      });
    }

    // Proceed with opening the URL (either entered or current)
    chrome.runtime.sendMessage({action: "openStartUrl", startUrl: startUrl}, function(response) {
      if (response && response.success) {
        console.log('Starting URL opened successfully');
        // You might want to update the UI here to indicate success
      } else {
        console.error('Failed to open starting URL');
        // You might want to show an error message to the user
      }
    });
  });

  // Add this new code for handling the select input field functionality
  const reselectInputButton = document.getElementById('reselectInputButton');
  const inputSelectorInput = document.getElementById('inputSelector');

  reselectInputButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "startSelectMode", mode: "input"}, function(response) {
      if (response && response.success) {
        console.log('Select mode started for input field');
      } else {
        console.error('Failed to start select mode for input field');
      }
    });
  });

  // Add this new code for handling the select submit element functionality
  const reselectSubmitButton = document.getElementById('reselectSubmitButton');
  const submitSelectorInput = document.getElementById('submitSelector');
  const useEnterToSubmitCheckbox = document.getElementById('useEnterToSubmit');

  reselectSubmitButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "startSelectMode", mode: "submit"}, function(response) {
      if (response && response.success) {
        console.log('Select mode started for submit element');
      } else {
        console.error('Failed to start select mode for submit element');
      }
    });
  });

  useEnterToSubmitCheckbox.addEventListener('change', function() {
    if (this.checked) {
      submitSelectorInput.value = '';
      submitSelectorInput.disabled = true;
      reselectSubmitButton.disabled = true;
    } else {
      submitSelectorInput.disabled = false;
      reselectSubmitButton.disabled = false;
    }
  });

  // Add this new code for handling the select output functionality
  const reselectOutputButton = document.getElementById('reselectOutputButton');
  const outputSelectorInput = document.getElementById('outputSelector');

  reselectOutputButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: "startSelectMode", mode: "output"}, function(response) {
      if (response && response.success) {
        console.log('Select mode started for output area');
      } else {
        console.error('Failed to start select mode for output area');
      }
    });
  });

  // Update the existing message listener
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "inputSelected") {
      inputSelectorInput.value = request.selector;
      console.log('Input selector updated:', request.selector);
    } else if (request.action === "submitSelected") {
      submitSelectorInput.value = request.selector;
      console.log('Submit selector updated:', request.selector);
      useEnterToSubmitCheckbox.checked = false;
      submitSelectorInput.disabled = false;
      reselectSubmitButton.disabled = false;
    } else if (request.action === "outputSelected") {
      outputSelectorInput.value = request.selector;
      console.log('Output selector updated:', request.selector);
    }
  });

  // Add this new code for handling the save settings functionality
  const saveButton = document.getElementById('saveButton');
  
  saveButton.addEventListener('click', function() {
    const settings = {
      startUrl: document.getElementById('startUrl').value,
      inputSelector: document.getElementById('inputSelector').value,
      submitSelector: document.getElementById('submitSelector').value,
      useEnterToSubmit: document.getElementById('useEnterToSubmit').checked,
      outputSelector: document.getElementById('outputSelector').value
    };

    // Save settings to Chrome storage
    chrome.storage.sync.set(settings, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving settings:', chrome.runtime.lastError);
        // You might want to show an error message to the user
      } else {
        console.log('Settings saved successfully');
        // You might want to show a success message to the user
      }
    });

    // Send settings to background script
    chrome.runtime.sendMessage({action: "updateSettings", settings: settings}, function(response) {
      if (response && response.success) {
        console.log('Settings updated in background script');
      } else {
        console.error('Failed to update settings in background script');
      }
    });
  });

  // Add this code to load saved settings when the sidepanel is opened
  chrome.storage.sync.get(['startUrl', 'inputSelector', 'submitSelector', 'useEnterToSubmit', 'outputSelector'], function(result) {
    if (chrome.runtime.lastError) {
      console.error('Error loading settings:', chrome.runtime.lastError);
    } else {
      document.getElementById('startUrl').value = result.startUrl || '';
      document.getElementById('inputSelector').value = result.inputSelector || '';
      document.getElementById('submitSelector').value = result.submitSelector || '';
      document.getElementById('useEnterToSubmit').checked = result.useEnterToSubmit || false;
      document.getElementById('outputSelector').value = result.outputSelector || '';

      // Update UI based on loaded settings
      if (result.useEnterToSubmit) {
        document.getElementById('submitSelector').disabled = true;
        document.getElementById('reselectSubmitButton').disabled = true;
      }
    }
  });

  // Add this new code for handling the perform search loop functionality
  const searchButton = document.getElementById('searchButton');
  const keywordTextarea = document.getElementById('keyword');
  const searchResultsDiv = document.getElementById('searchResults');

  searchButton.addEventListener('click', function() {
    const keywords = keywordTextarea.value.split('\n').filter(keyword => keyword.trim() !== '');
    if (keywords.length === 0) {
      alert('Please enter at least one keyword.');
      return;
    }

    const settings = {
      startUrl: document.getElementById('startUrl').value,
      inputSelector: document.getElementById('inputSelector').value,
      submitSelector: document.getElementById('submitSelector').value,
      useEnterToSubmit: document.getElementById('useEnterToSubmit').checked,
      outputSelector: document.getElementById('outputSelector').value
    };

    chrome.runtime.sendMessage({
      action: "performSearch",
      keywords: keywords,
      settings: settings
    }, function(response) {
      if (response && response.success) {
        console.log('Search loop started');
      } else {
        console.error('Failed to start search loop:', response ? response.error : 'Unknown error');
        alert('Failed to start search loop. Please check the console for more details.');
      }
    });
  });

  // Add this to handle search results
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "searchResult") {
      const resultElement = document.createElement('div');
      resultElement.textContent = `${request.keyword}: ${request.result}`;
      searchResultsDiv.appendChild(resultElement);
    }
  });

  // ... (keep the rest of the existing code)
});

// ... (keep any other existing functions)