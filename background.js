let popupWindowId = null;

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
  if (request.action === "performSearch") {
    performSearchSequence(request.url, request.keywords, request.inputSelector, request.submitSelector);
  } else if (request.action === "startSelectMode") {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "startSelectMode"});
      }
    });
  } else if (request.action === "inputSelected") {
    chrome.runtime.sendMessage({action: "inputSelected", selector: request.selector});
  }
});

async function performSearchSequence(url, keywords, inputSelector, submitSelector) {
  let tab = await chrome.tabs.create({ url: url });
  
  // Wait for the page to load
  await new Promise(resolve => setTimeout(resolve, 5000));

  for (let keyword of keywords) {
    await chrome.tabs.sendMessage(tab.id, {
      action: "performSearch",
      keyword: keyword,
      inputSelector: inputSelector,
      submitSelector: submitSelector
    });

    // Wait for search results
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}