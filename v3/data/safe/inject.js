'use strict';

try {
  document.body.removeChild(window.iframe);
}
catch (e) {}

window.iframe = document.createElement('iframe');
window.iframe.setAttribute('style', `
  border: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 100%;
  margin-left: auto;
  margin-right: auto;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 10000000000;
  color-scheme: none;
`);
document.body.appendChild(window.iframe);
window.iframe.src = chrome.runtime.getURL('/data/safe/index.html') +
  '?url=' + encodeURIComponent(document.location.href);
