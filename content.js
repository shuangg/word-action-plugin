let isSelectMode = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startSelectMode") {
    isSelectMode = true;
    document.body.style.cursor = 'crosshair';
    alert('Click on the input field you want to use for searching.');
  } else if (request.action === "performSearch") {
    performSearch(request.keyword, request.inputSelector, request.submitSelector);
  }
});

document.addEventListener('click', (e) => {
  if (isSelectMode) {
    e.preventDefault();
    isSelectMode = false;
    document.body.style.cursor = 'default';
    
    let element = e.target;
    let selector = generateSelector(element);
    
    chrome.runtime.sendMessage({
      action: 'inputSelected',
      selector: selector
    });
    
    alert('Input field selected: ' + selector);
  }
});

function generateSelector(element) {
  if (element.id) {
    return '#' + element.id;
  }
  if (element.className) {
    return '.' + element.className.split(' ').join('.');
  }
  let selector = element.tagName.toLowerCase();
  let siblings = element.parentNode.children;
  if (siblings.length > 1) {
    let index = Array.from(siblings).indexOf(element);
    selector += `:nth-child(${index + 1})`;
  }
  return selector;
}

function performSearch(keyword, inputSelector, submitSelector) {
  console.log('Performing search:', keyword, inputSelector, submitSelector);
  const inputElement = document.querySelector(inputSelector);
  if (inputElement) {
    inputElement.value = keyword;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    
    setTimeout(() => {
      const submitElement = document.querySelector(submitSelector);
      if (submitElement) {
        submitElement.click();
      } else if (inputElement.form) {
        inputElement.form.submit();
      }
    }, 1000);
  } else {
    console.error('Input element not found');
  }
}

console.log('Content script loaded');