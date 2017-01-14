'use strict';

// will be used to focus the element after text insertion
var aElement = document.activeElement; //jshint ignore:line

var iframe = document.createElement('iframe');
iframe.setAttribute('style', `
  border: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 450px;
  height: 400px;
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
  background-color: #414141;
  z-index: 10000000000;
`);
// try to find filled usernames
var forms = Array.from(document.querySelectorAll('input[type=password]'))
  .map(p => p.form)
  .filter(f => f)
  .filter((f, i, l) => l.indexOf(f) === i);
var usernames = forms.map(f => [...f.querySelectorAll('input:not([type=password])')]
    .filter(i => (i.type === 'text' || i.type === 'email'))
)
.reduce((p, c) => p.concat(c), [])
.map(e => e && e.value ? e.value : null)
.filter(n => n);

iframe.src = chrome.runtime.getURL('data/cmd/index.html') +
  '?url=' + encodeURIComponent(document.location.href) +
  '&usernames=' + JSON.stringify(usernames);
document.body.appendChild(iframe);

''; // jshint ignore:line
