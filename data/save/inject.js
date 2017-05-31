'use strict';

try {
  document.body.removeChild(window.iframe);
}
catch (e) {}
var iframe;

function inspect () {
  const forms = [...document.querySelectorAll('input[type=password]')]
    .map(p => p.form)
    .filter(f => f)
    .filter((f, i, l) => l.indexOf(f) === i);

  chrome.runtime.sendMessage({
    cmd: 'guesses',
    usernames: forms.map(f => [
      ...f.querySelectorAll('input[type=text]'),
      ...f.querySelectorAll('input[type=email]')
    ])
      .reduce((p, c) => p.concat(c), [])
      .map(e => e && e.value ? e.value : null)
      .filter(n => n),
    passwords: forms.map(f => [
      ...f.querySelectorAll('input[type=password]')
    ])
      .reduce((p, c) => p.concat(c), [])
      .map(e => e && e.value ? e.value : null)
      .filter(n => n),
  });
}

if (window === window.top) {
  let usernames = [], passwords = [];
  const observe = (request) => {
    if (request.usernames) {
      usernames = usernames.concat(request.usernames);
    }
    if (request.passwords) {
      passwords = passwords.concat(request.passwords);
    }
  };

  chrome.runtime.onMessage.addListener(observe);

  iframe = document.createElement('iframe');
  iframe.setAttribute('style', `
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
  `);
  document.body.appendChild(iframe);
  iframe.src = chrome.runtime.getURL('/data/save/index.html') +
    '?url=' + encodeURIComponent(document.location.href);
  iframe.addEventListener('load', () => {
    iframe.contentWindow.postMessage({
      cmd: 'guesses',
      usernames,
      passwords
    }, '*');
    chrome.runtime.onMessage.removeListener(observe);
    inspect();
  });
}
else {
  inspect();
}
