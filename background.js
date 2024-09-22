let popupWindowId = null;
let currentTabId = null;

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
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
      chrome.tabs.sendMessage(currentTabId, {action: "startSelectMode", mode: request.mode});
      sendResponse({success: true});
    } else {
      console.error('No current tab to start select mode');
      sendResponse({success: false, error: 'No current tab to start select mode'});
    }
  } else if (request.action === "inputSelected" || request.action === "outputSelected") {
    // Relay the message to the popup
    chrome.runtime.sendMessage(request);
    // Also update the storage
    chrome.storage.sync.set({[request.action === "inputSelected" ? "inputSelector" : "outputSelector"]: request.selector});
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

    processKeywords(request, 0)
      .then(resolve)
      .catch(reject);
  });
}

function processKeywords(request, index) {
  return new Promise((resolve, reject) => {
    if (index >= request.keywords.length) {
      console.log('All keywords processed');
      resolve();
      return;
    }

    const keyword = request.keywords[index];
    console.log(`Processing keyword ${index + 1}/${request.keywords.length}: ${keyword}`);

    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "performSearch",
          keyword: keyword,
          inputSelector: request.inputSelector,
          submitSelector: request.submitSelector,
          outputSelector: request.outputSelector,
          useEnterToSubmit: request.useEnterToSubmit
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Error sending message to content script: ${chrome.runtime.lastError.message}`));
          } else if (response && response.success) {
            console.log(`Search performed successfully for keyword: ${keyword}`);
            chrome.runtime.sendMessage({
              action: "searchResult",
              keyword: keyword,
              result: response.result
            });
            setTimeout(() => {
              processKeywords(request, index + 1)
                .then(resolve)
                .catch(reject);
            }, 5000); // Wait for 5 seconds before moving to the next keyword
          } else {
            reject(new Error(`Search failed for keyword: ${keyword}`));
          }
        });
      } else {
        reject(new Error('No active tab found'));
      }
    });
  });
}