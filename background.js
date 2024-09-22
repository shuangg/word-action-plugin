let popupWindowId = null;
let currentTabId = null;

chrome.action.onClicked.addListener((tab) => {
  if (popupWindowId === null) {
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600
    }, (window) => {
      popupWindowId = window.id;
    });
  } else {
    chrome.windows.update(popupWindowId, { focused: true });
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  if (request.action === "performSearch") {
    performSearch(request)
      .then(() => sendResponse({success: true}))
      .catch((error) => sendResponse({success: false, error: error.message}));
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "startSelectMode") {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, {action: "startSelectMode"});
      sendResponse({success: true});
    } else {
      console.error('No current tab to start select mode');
      sendResponse({success: false, error: 'No current tab to start select mode'});
    }
  } else if (request.action === "inputSelected") {
    // Relay the message to the popup
    chrome.runtime.sendMessage({action: "inputSelected", selector: request.selector});
    // Also update the storage
    chrome.storage.sync.set({inputSelector: request.selector});
    sendResponse({success: true});
  } else if (request.action === "openStartUrl") {
    openStartUrl(request.startUrl, sendResponse);
    return true; // Indicates that the response will be sent asynchronously
  }
});

function openStartUrl(startUrl, sendResponse) {
  if (startUrl) {
    chrome.tabs.create({ url: startUrl }, (tab) => {
      console.log('Opened starting URL:', startUrl);
      currentTabId = tab.id;
      sendResponse({ success: true });
    });
  } else {
    console.error('No starting URL provided');
    sendResponse({ success: false });
  }
}

function performSearch(request) {
  return new Promise((resolve, reject) => {
    console.log('Performing search:', request);
    if (!request.startUrl) {
      reject(new Error('No starting URL provided for search'));
      return;
    }

    chrome.tabs.create({ url: request.startUrl }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          setTimeout(() => {
            continueSearch(tab.id, request)
              .then(resolve)
              .catch(reject);
          }, 1000); // Wait for 1 second after page load before continuing the search
        }
      });
    });
  });
}

function continueSearch(tabId, request) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, {
      action: "performSearch",
      keywords: request.keywords, // Pass all keywords
      inputSelector: request.inputSelector,
      submitSelector: request.submitSelector,
      useEnterToSubmit: request.useEnterToSubmit
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(`Error sending message to content script: ${chrome.runtime.lastError.message}`));
      } else if (response && response.success) {
        console.log('Search performed successfully');
        resolve();
      } else {
        reject(new Error('Search failed or no response from content script'));
      }
    });
  });
}