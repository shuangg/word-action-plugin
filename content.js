console.log('Content script loaded and running');

let isSelectMode = false;
let selectMode = '';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === "startSelectMode") {
    isSelectMode = true;
    selectMode = request.mode;
    document.body.style.cursor = 'crosshair';
    if (selectMode === 'input') {
      alert('Please click on the input field you want to select.');
    } else if (selectMode === 'submit') {
      alert('Please click on the submit button or link you want to select.');
    } else if (selectMode === 'output') {
      alert('Please click on the output area you want to select.');
    }
    sendResponse({success: true});
  } else if (request.action === "performSearch") {
    waitForPageReady()
      .then(() => performSearch(request))
      .then(result => {
        console.log('Search performed successfully:', result);
        sendResponse({success: true, result: result});
      })
      .catch(error => {
        console.error('Search failed:', error);
        sendResponse({success: false, error: error.message});
      });
    return true; // Indicates that the response will be sent asynchronously
  }
});

function waitForPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

document.addEventListener('click', function(e) {
  if (isSelectMode) {
    e.preventDefault();
    e.stopPropagation();
    
    let selector = generateSelector(e.target);
    
    chrome.runtime.sendMessage({
      action: selectMode + "Selected",
      selector: selector
    });
    
    isSelectMode = false;
    selectMode = '';
    document.body.style.cursor = 'default';
  }
}, true);

function generateSelector(element) {
  if (element.id) {
    return '#' + element.id;
  }
  if (element.className) {
    return '.' + element.className.split(' ').join('.');
  }
  let selector = element.tagName.toLowerCase();
  let parent = element.parentNode;
  if (parent && parent !== document) {
    selector = generateSelector(parent) + ' > ' + selector;
  }
  return selector;
}

async function performSearch(request) {
  console.log('Performing search with request:', request);
  const inputElement = document.querySelector(request.inputSelector);
  if (!inputElement) {
    throw new Error('Input element not found');
  }

  inputElement.value = request.keyword;
  inputElement.dispatchEvent(new Event('input', { bubbles: true }));

  if (request.useEnterToSubmit) {
    inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  } else {
    const submitElement = document.querySelector(request.submitSelector);
    if (!submitElement) {
      throw new Error('Submit element not found');
    }
    submitElement.click();
  }

  await new Promise(resolve => setTimeout(resolve, 10000)); // Increased wait time to 10 seconds

  const outputElement = document.querySelector(request.outputSelector);
  if (!outputElement) {
    throw new Error('Output element not found');
  }

  return outputElement.textContent.trim();
}

console.log('Content script setup complete');