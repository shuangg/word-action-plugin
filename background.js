let currentTabId = null;
let currentSettings = {};

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  if (request.action === "performSearch") {
    performSearch(request)
      .then(() => sendResponse({success: true}))
      .catch((error) => sendResponse({success: false, error: error.message}));
    return true;
  } else if (request.action === "startSelectMode") {
    if (currentTabId) {
      chrome.tabs.sendMessage(currentTabId, {action: "startSelectMode", mode: request.mode});
      sendResponse({success: true});
    } else {
      console.error('No current tab to start select mode');
      sendResponse({success: false, error: 'No current tab to start select mode'});
    }
    return true;
  } else if (request.action === "inputSelected" || request.action === "submitSelected" || request.action === "outputSelected") {
    chrome.runtime.sendMessage(request);
    sendResponse({success: true});
    return true;
  } else if (request.action === "openStartUrl") {
    openStartUrl(request.startUrl, sendResponse);
    return true;
  } else if (request.action === "updateSettings") {
    currentSettings = request.settings;
    console.log('Settings updated:', currentSettings);
    sendResponse({success: true});
    return true;
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
    if (!request.settings.startUrl) {
      reject(new Error('No starting URL provided for search'));
      return;
    }

    chrome.tabs.create({ url: request.settings.startUrl }, (tab) => {
      currentTabId = tab.id;
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            console.log('Content script injected');
            setTimeout(() => {
              processKeywords(request.keywords, request.settings, 0, tab.id, 5)
                .then(resolve)
                .catch(reject);
            }, 5000); // Increased delay to 5 seconds
          });
        }
      });
    });
  });
}

function processKeywords(keywords, settings, index, tabId, retries) {
  return new Promise((resolve, reject) => {
    if (index >= keywords.length) {
      console.log('All keywords processed');
      resolve();
      return;
    }

    const keyword = keywords[index];
    console.log(`Processing keyword ${index + 1}/${keywords.length}: ${keyword}`);

    chrome.tabs.sendMessage(tabId, {
      action: "performSearch",
      keyword: keyword,
      inputSelector: settings.inputSelector,
      submitSelector: settings.submitSelector,
      outputSelector: settings.outputSelector,
      useEnterToSubmit: settings.useEnterToSubmit
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`Error sending message to content script: ${chrome.runtime.lastError.message}`);
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          setTimeout(() => {
            processKeywords(keywords, settings, index, tabId, retries - 1)
              .then(resolve)
              .catch(reject);
          }, 5000); // Increased retry delay to 5 seconds
        } else {
          reject(new Error(`Failed to communicate with content script after multiple attempts`));
        }
      } else if (response && response.success) {
        console.log(`Search performed successfully for keyword: ${keyword}`);
        chrome.runtime.sendMessage({
          action: "searchResult",
          keyword: keyword,
          result: response.result
        });
        setTimeout(() => {
          processKeywords(keywords, settings, index + 1, tabId, 5)
            .then(resolve)
            .catch(reject);
        }, 10000); // Increased delay between keywords to 10 seconds
      } else {
        reject(new Error(`Search failed for keyword: ${keyword}`));
      }
    });
  });
}