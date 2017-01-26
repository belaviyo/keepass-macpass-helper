'use strict';

var iframe;

function isEditable (el) {
  let node = el.nodeName.toLowerCase();
  if (el.nodeType === 1 && (node === 'textarea' ||
    (node === 'input' && /^(?:text|email|number|search|tel|url|password)$/i.test(el.type)))) {
    return true;
  }
  return el.isContentEditable;
}

// will be used to focus the element after text insertion
var aElement = document.activeElement; //jshint ignore:line
aElement = isEditable(aElement) ? aElement : null;

if (window === window.top) {
  iframe = document.createElement('iframe');
  iframe.setAttribute('style', `
    border: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 500px;
    height: 400px;
    max-width: 80%;
    margin-left: auto;
    margin-right: auto;
    background-color: #414141;
    z-index: 10000000000;
  `);

  document.body.appendChild(iframe);
  chrome.runtime.onMessage.addListener(request => {
    if (request.cmd === 'url-is') {
      iframe.src = request.url;
    }
  });
}

if (aElement) {
  // try to find filled usernames
  let forms = Array.from(document.querySelectorAll('input[type=password]'))
    .map(p => p.form)
    .filter(f => f)
    .filter((f, i, l) => l.indexOf(f) === i);
  let usernames = forms.map(f => [...f.querySelectorAll('input:not([type=password])')]
      .filter(i => (i.type === 'text' || i.type === 'email'))
  )
  .reduce((p, c) => p.concat(c), [])
  .map(e => e && e.value ? e.value : null)
  .filter(n => n);
  console.error('sending', usernames)
  chrome.runtime.sendMessage({
    cmd: 'url-is',
    url: chrome.runtime.getURL('data/cmd/index.html') +
      '?url=' + encodeURIComponent(document.location.href) +
      '&usernames=' + JSON.stringify(usernames)
  });
}

''; // jshint ignore:line
