let isSelectMode = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelectMode") {
    isSelectMode = true;
    document.body.style.cursor = 'crosshair';
    alert('Click on the input field you want to use for searching.');
  } else if (request.action === "performSearch") {
    performSearch(request.keyword, request.inputSelector, request.submitSelector, request.useEnterToSubmit);
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
  console.log('Performing search:', keyword, inputSelector, submitSelector, useEnterToSubmit);
  const inputElement = document.querySelector(inputSelector);
  if (inputElement) {
    // Set the value and trigger input event
    inputElement.value = keyword;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Trigger change event
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));

    // Small delay to ensure the value is set
    setTimeout(() => {
      if (useEnterToSubmit) {
        // Simulate pressing Enter
        const form = inputElement.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        } else {
          inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        }
      } else if (submitSelector) {
        // Click the submit button
        const submitButton = document.querySelector(submitSelector);
        if (submitButton) {
          submitButton.click();
        } else {
          console.error('Submit button not found');
        }
      } else {
        // If no submit method is specified, try to submit the form
        const form = inputElement.closest('form');
        if (form) {
          form.submit();
        } else {
          console.error('No form found and no submit method specified');
        }
      }
    }, 100);
  } else {
    console.error('Input element not found');
  }
}

console.log('Content script loaded');