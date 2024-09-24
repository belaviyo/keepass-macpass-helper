'use strict';

for (const e of document.querySelectorAll('dialog.kphelper')) {
  e.remove();
}

{
  const dialog = document.createElement('dialog');
  dialog.classList.add('kphelper', 'embedded');
  const iframe = document.createElement('iframe');
  iframe.activeElement = document.activeElement;
  dialog.append(iframe);
  (document.body || document.documentElement).append(dialog);
  iframe.onload = () => iframe.contentWindow.postMessage({
    pairs: window.pairs
  }, '*');
  iframe.src = chrome.runtime.getURL('/data/cmd/index.html');
  // Do not use showModal since we are injecting into the DOM
  dialog.show();
}
