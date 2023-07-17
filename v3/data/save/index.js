/* global engine, tldjs */
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
  else if (cmd === 'reset') {
    start();
    onmessage();
  }
  else if (cmd === 'toggle') {
    target.dataset.type = target.dataset.type === 'password' ? 'text' : 'password';
    document.querySelector('[name="password"]').type = target.dataset.type;
    target.value = target.dataset.type === 'password' ? 'Show' : 'Hide';
  }
  else if (cmd === 'trim' || cmd === 'domain') {
    const input = target.parentElement.querySelector('input[type="text"]');
    try {
      const url = new URL(input.value);
      if (cmd === 'trim') {
        input.value = url.origin;
      }
      else {
        input.value = url.protocol + '//' + tldjs.getDomain(url.href);
      }
      input.focus();
    }
    catch (e) {
      console.error(e);
      alert(e.message);
    }
  }
});

document.addEventListener('submit', e => {
  e.preventDefault();

  const b = e.submitter || document.querySelector('input[type=submit]');
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

      if (e.submitter.dataset.cmd == 'ssdb') {
        if (engine.ssdb) {
          const uuid = await engine.ssdb.convert(query.url);
          await engine.ssdb.append(uuid, {
            'Url': query.url,
            'SubmitUrl': query.url.submiturl,
            'Login': query.login,
            'Password': query.password
          });
        }
        else {
          b.disabled = false;
          return alert('Secure synced storage is not open. Use the popup interface to open it, then retry.');
        }
      }
      else {
        await engine.set(query);
      }

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

const onmessage = (o = onmessage.o) => {
  onmessage.o = o;
  const pair = o.data.pairs.filter(a => {
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
  document.querySelector('[name=url]').focus();
  document.querySelector('[name=url]').select();
};
addEventListener('message', onmessage, {once: true});

const start = () => {
  document.querySelector('[name=url]').value = args.get('url');
  document.querySelector('[name=submiturl]').value = '';

  addEventListener('load', () => setTimeout(() => {
    window.focus();
  }, 100));
};
start();
