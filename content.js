console.log('Content script loaded and running');

let isSelectMode = false;
let selectMode = '';
let startUrl = '';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === "startSelectMode") {
    isSelectMode = true;
    selectMode = request.mode;
    startUrl = request.startUrl;
    document.body.style.cursor = 'crosshair';
    alert(`Click on the ${selectMode} you want to use.`);
    console.log('Select mode started:', selectMode);
    sendResponse({success: true});
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "performSearch") {
    console.log('Received performSearch message:', request);
    performSearch(request.keyword, request.inputSelector, request.submitSelector, request.outputSelector, request.useEnterToSubmit)
      .then(result => sendResponse({success: true, result: result}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // Indicates that the response will be sent asynchronously
  } else if (request.action === "checkPageReady") {
    // You can add more sophisticated checks here if needed
    sendResponse({ready: document.readyState === "complete"});
    return true; // Indicates that the response will be sent asynchronously
  }
});

document.addEventListener('click', (e) => {
  if (isSelectMode) {
    e.preventDefault();
    e.stopPropagation();
    isSelectMode = false;
    document.body.style.cursor = 'default';
    
    const currentUrl = window.location.href;
    if (!currentUrl.includes(startUrl)) {
      alert(`Error: The current page URL (${currentUrl}) does not contain the starting URL (${startUrl}). Please navigate to the correct page first.`);
      return false;
    }
    
    let element = e.target;
    let selector = generateSelector(element);
    
    chrome.runtime.sendMessage({
      action: selectMode === 'input field' ? 'inputSelected' : 'outputSelected',
      selector: selector
    });
    
    console.log(`${selectMode} selected:`, selector);
    alert(`${selectMode} selected: ` + selector);
    return false;
  }
});

function generateSelector(element) {
  if (element.id) {
    return '#' + CSS.escape(element.id);
  }
  if (element.className) {
    return '.' + element.className.split(' ').map(c => CSS.escape(c)).join('.');
  }
  let path = [];
  while (element.nodeType === Node.ELEMENT_NODE) {
    let selector = element.nodeName.toLowerCase();
    if (element.id) {
      selector += '#' + CSS.escape(element.id);
      path.unshift(selector);
      break;
    } else {
      let sibling = element;
      let nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName.toLowerCase() === selector)
          nth++;
      }
      if (nth !== 1)
        selector += ":nth-of-type("+nth+")";
    }
    path.unshift(selector);
    element = element.parentNode;
  }
  return path.join(' > ');
}

async function performSearch(keyword, inputSelector, submitSelector, outputSelector, useEnterToSubmit) {
  console.log('Performing search for keyword:', keyword);
  const inputElement = document.querySelector(inputSelector);
  if (inputElement) {
    // Set the value and trigger input event
    inputElement.value = keyword;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    // Submit the form
    await new Promise(resolve => setTimeout(resolve, 1000));
    const form = inputElement.closest('form');
    if (form) {
      console.log('Submitting form');
      form.submit();
    } else {
      console.log('No form found, simulating Enter key press');
      inputElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true}));
    }

    // Wait for the results to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get the output
    const outputElement = document.querySelector(outputSelector);
    if (outputElement) {
      return outputElement.innerText || outputElement.textContent;
    } else {
      throw new Error('Output element not found');
    }
  } else {
    throw new Error('Input element not found');
  }
}

console.log('Content script setup complete');