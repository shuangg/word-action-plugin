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
    performSearch(request);
  } else if (request.action === "startSelectMode") {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, {action: "startSelectMode"});
    } else {
      console.error('No current tab to start select mode');
    }
  } else if (request.action === "inputSelected") {
    // Relay the message to the popup
    chrome.runtime.sendMessage({action: "inputSelected", selector: request.selector});
    // Also update the storage
    chrome.storage.sync.set({inputSelector: request.selector});
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
  console.log('Performing search:', request);
  if (!request.startUrl) {
    console.error('No starting URL provided for search');
    return;
  }

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0] && tabs[0].url === request.startUrl) {
      // We're already on the correct page, proceed with search
      continueSearch(tabs[0].id, request);
    } else {
      // We need to navigate to the starting URL first
      chrome.tabs.create({ url: request.startUrl }, (tab) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            continueSearch(tab.id, request);
          }
        });
      });
    }
  });
}

function continueSearch(tabId, request) {
  // Send a message to the content script to perform the search
  chrome.tabs.sendMessage(tabId, {
    action: "performSearch",
    keyword: request.keywords[0], // For now, just use the first keyword
    inputSelector: request.inputSelector,
    submitSelector: request.submitSelector,
    useEnterToSubmit: request.useEnterToSubmit  // Make sure this line is present
  });
}