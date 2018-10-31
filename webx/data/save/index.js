'use strict';

// styling
try { // https://github.com/belaviyo/keepass-macpass-helper/issues/27
  const style = localStorage.getItem('save-dialog-style');
  console.log(style);
  if (style) {
    const e = document.createElement('style');
    e.textContent = style;
    document.documentElement.appendChild(e);
  }
}
catch(e) {}

var {url} = document.location.search.split('?')[1].split('&').map(s => s.split('='))
.reduce((p, c) => Object.assign(p, {
  [c[0]]: decodeURIComponent(c[1])
}), {});

document.addEventListener('click', e => {
  const target = e.target;
  const cmd = target.dataset.cmd;

  if (cmd === 'cancel') {
    chrome.runtime.sendMessage({cmd: 'close-me'});
  }
  else if (cmd === 'toggle') {
    target.dataset.type = target.dataset.type === 'password' ? 'text' : 'password';
    document.querySelector('[name="password"]').type = target.dataset.type;
    target.value = target.dataset.type === 'password' ? 'Show' : 'Hide';
  }
  else if (cmd === 'simplify') {
    const input = target.closest('tr').querySelector('input[type=text');
    if (input.value) {
      try {
        const url = new URL(input.value);
        input.value = url.origin;
        input.focus();
      }
      catch (e) {}
    }
  }
});

document.addEventListener('keydown', e => {
  if (e.code === 'Escape') {
    document.querySelector('[data-cmd=cancel]').click();
    e.preventDefault();
  }
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  chrome.runtime.sendMessage({
    cmd: 'save-form',
    data
  }, () => document.querySelector('[data-cmd=cancel]').click());
});

window.addEventListener('message', ({data}) => {
  data.usernames.forEach(n => document.querySelector('[name=login]').value = n);
  data.passwords.forEach(n => document.querySelector('[name=password]').value = n);
});
chrome.runtime.sendMessage({
  cmd: 'collect'
});

document.querySelector('[name=url]').value = url;
document.querySelector('[name=url]').focus();
document.querySelector('[name=url]').select();

// keep focus
window.addEventListener('blur', () => window.setTimeout(window.focus, 0));
