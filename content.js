let isSelectMode = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelectMode") {
    isSelectMode = true;
    document.body.style.cursor = 'crosshair';
    alert('Click on the input field you want to use for searching.');
  } else if (request.action === "performSearch") {
    console.log('Received performSearch message:', request);
    performSearch(request.keyword, request.inputSelector, request.submitSelector, request.useEnterToSubmit);
    sendResponse({success: true});
    return true; // Indicates that the response will be sent asynchronously
  }
});

document.addEventListener('click', (e) => {
  if (isSelectMode) {
    e.preventDefault();
    e.stopPropagation();
    isSelectMode = false;
    document.body.style.cursor = 'default';
    
    let element = e.target;
    let selector = generateSelector(element);
    
    chrome.runtime.sendMessage({
      action: 'inputSelected',
      selector: selector
    });
    
    console.log('Input field selected:', selector);
    alert('Input field selected: ' + selector);
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

function performSearch(keyword, inputSelector, submitSelector, useEnterToSubmit) {
  console.log('Performing search for keyword:', keyword);
  const inputElement = document.querySelector(inputSelector);
  if (inputElement) {
    // Set the value and trigger input event
    inputElement.value = keyword;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    // Submit the form
    setTimeout(() => {
      const form = inputElement.closest('form');
      if (form) {
        console.log('Submitting form');
        form.submit();
      } else {
        console.log('No form found, simulating Enter key press');
        inputElement.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true}));
      }
    }, 1000);
  } else {
    console.error('Input element not found');
  }
  return true; // Indicate that the search was performed
}

console.log('Content script loaded');