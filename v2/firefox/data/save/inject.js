'use strict';

var isTop = window === window.top;

try {
  document.body.removeChild(window.iframe);
}
catch (e) {}
var iframe;

var usernames = [];
var passwords = [];

if (isTop) {
  const observe = request => {
    if (request.cmd === 'guesses') {
      usernames = usernames.concat(request.usernames);
      passwords = passwords.concat(request.passwords);
    }
    else if (request.cmd === 'collect') {
      iframe.contentWindow.postMessage({
        usernames,
        passwords
      }, '*');
      chrome.runtime.onMessage.removeListener(observe);
    }
  };
  chrome.runtime.onMessage.addListener(observe);
}

{ // collecting
  const forms = [...document.querySelectorAll('input[type=password]')]
    .map(p => {
      let form = p.closest('form');
      // what if there is no form element
      let parent = p;
      for (let i = 0; i < 5; i += 1) {
        parent = parent.parentElement;
        if (parent.querySelector('input[type=text],input[type=email]')) {
          form = parent;
          break;
        }
      }
      return form;
    })
    .filter(f => f)
    .filter((f, i, l) => l.indexOf(f) === i);

  usernames.push(...forms.map(f => [
    ...f.querySelectorAll('input[type=text]'),
    ...f.querySelectorAll('input[type=email]')
  ])
    .reduce((p, c) => p.concat(c), [])
    .map(e => e && e.value ? e.value : null)
    .filter(n => n));

  passwords.push(...forms.map(f => [
    ...f.querySelectorAll('input[type=password]')
  ])
    .reduce((p, c) => p.concat(c), [])
    .map(e => e && e.value ? e.value : null)
    .filter(n => n));

  if (isTop === false) {
    chrome.runtime.sendMessage({
      cmd: 'guesses',
      usernames,
      passwords
    });
  }
}

if (isTop) {
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
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 10000000000;
  `);
  document.body.appendChild(iframe);
  iframe.src = chrome.runtime.getURL('/data/save/index.html') +
    '?url=' + encodeURIComponent(document.location.href);
}
