/* global engine */
'use strict';

// styling
try { // https://github.com/belaviyo/keepass-macpass-helper/issues/27
  const style = localStorage.getItem('save-dialog-style');
  if (style) {
    const e = document.createElement('style');
    e.textContent = style;
    document.documentElement.appendChild(e);
  }
}
catch (e) {}

const args = new URLSearchParams(location.search);

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
    const input = target.previousElementSibling;
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

document.addEventListener('submit', e => {
  e.preventDefault();

  const b = document.querySelector('input[type=submit]');
  b.disabled = true;

  const formData = new FormData(e.target);
  const query = {};
  for (const [key, value] of formData.entries()) {
    query[key] = value;
  }

  chrome.storage.local.get({
    engine: 'keepass'
  }, async prefs => {
    try {
      await engine.prepare(prefs.engine);

      if (prefs.engine === 'kwpass') {
        await engine.core.open(prompt('Password to unlock the database?'));
      }

      await engine.set(query);

      b.value = 'done!';
      setTimeout(() => {
        document.querySelector('[data-cmd=cancel]').click();
      }, 2000);
    }
    catch (e) {
      console.warn(e);
      alert(e.message);
      b.disabled = false;
    }
  });
});

window.addEventListener('message', ({data}) => {
  const pair = data.pairs.filter(a => {
    return a.usernames.length || a.passwords.length;
  }).sort((a, b) => {
    if (a.usernames.length && a.passwords.length) {
      return -1;
    }
    if (b.usernames.length && b.passwords.length) {
      return 1;
    }
  }).shift();
  if (pair) {
    document.querySelector('[name=login]').value = pair.usernames.filter(s => s).shift() || '';
    document.querySelector('[name=password]').value = pair.passwords.filter(s => s).shift() || '';
  }
});
chrome.runtime.sendMessage({
  cmd: 'collect'
});

document.querySelector('[name=url]').value = args.get('url');
document.querySelector('[name=url]').focus();
document.querySelector('[name=url]').select();
