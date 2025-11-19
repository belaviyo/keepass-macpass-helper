/* global engine */
const args = new URLSearchParams(location.search);

const copy = content => navigator.clipboard.writeText(content).catch(e => {
  alert(e.message);
});

document.getElementById('data').value = args.get('data');

document.getElementById('save-name').onclick = () => copy(document.getElementById('name').value);
document.getElementById('save-value').onclick = () => copy(document.getElementById('data').value);

onbeforeunload = e => {
  event.preventDefault();
  event.returnValue = '';
};
document.getElementById('done').onclick = () => {
  onbeforeunload = () => {};
  close();
};
document.getElementById('refresh').onclick = () => {
  onbeforeunload = () => {};
  location.reload();
};

chrome.storage.local.get({
  engine: 'keepass'
}).then(async prefs => {
  await engine.prepare(prefs.engine);

  // ssdb
  if (engine.ssdb) {
    const json = JSON.parse(args.get('data'));

    document.getElementById('ssdb').disabled = false;
    document.getElementById('ssdb').onclick = async () => {
      document.getElementById('ssdb').disabled = true;
      try {
        const uuid = (await engine.ssdb.convert(args.get('href'))).at(0);
        await engine.ssdb.append(uuid, {
          'Url': args.get('href'),
          'SubmitUrl': '',
          'Login': json.USERNAME + ' (' + json.CREDENTIAL_ID + ')',
          'Name': 'Passkey',
          'Password': '',
          'StringFields': [{
            Key: 'PASSKEY_STORAGE',
            Value: args.get('data')
          }]
        });
        document.getElementById('ssdb').value = 'Saved';
      }
      catch (e) {
        console.error(e);
        alert(e.message);
        document.getElementById('ssdb').value = 'Error';
      }
    };
  }
  else {
    document.getElementById('ssdb-info').style.display = 'contents';
  }
  // KeePass
  document.getElementById('keepass').onclick = async ({target}) => {
    const json = JSON.parse(args.get('data'));
    const entry = {
      'url': args.get('href'),
      'submiturl': '',
      'login': json.USERNAME + ' (' + json.CREDENTIAL_ID + ')',
      'name': 'Passkey', // only for kdbweb
      'password': '',
      'stringFields': []
    };
    // Use KeePassXC compatible format
    if (document.querySelector('input[name=format]:checked').value === 'json') {
      entry.stringFields.push({
        key: 'KPH: PASSKEY_STORAGE',
        value: args.get('data')
      });
    }
    else {
      for (const [key, value] of Object.entries(json)) {
        if (key === 'FLAGS') {
          continue;
        }
        entry.stringFields.push({
          key: ['KPEX_PASSKEY_' + key],
          value
        });
      }
    }

    try {
      // KWPass
      if (prefs.engine === 'kwpass') {
        target.disabled = true;

        let password;
        const ps = await chrome.storage.session.get({
          'kw:password': ''
        });
        if (ps['kw:password']) {
          password = ps['kw:password'];
        }
        else {
          const dialog = document.getElementById('prompt');
          dialog.showModal();
          dialog.querySelector('input[type=password]').value = '';

          password = await new Promise(resolve => {
            dialog.oncancel = e => {
              e.preventDefault();
              resolve('');
            };
            dialog.querySelector('input[type=button]').onclick = e => {
              resolve('');
            };
            dialog.querySelector('form').onsubmit = e => {
              e.preventDefault();
              e.stopPropagation();
              resolve(dialog.querySelector('input[type=password]').value);
            };
          });
          dialog.close();
        }

        if (password) {
          await engine.core.open(password);
          await engine.set(entry);
          target.value = 'Saved';
        }
        else {
          return;
        }
      }
      // KeePassHTTP > 2.1.0.0
      else if (prefs.engine === 'keepass' && engine.core.version && engine.core.version > 2100) {
        target.disabled = true;
        await engine.set(entry);
        target.value = 'Saved';
      }
      else {
        let msg = '';
        if (prefs.engine === 'keepass') {
          msg = `You are currently using a deprecated KeePassHTTP plugin, which does not support saving string fields. Please do one of the following:

1. Manually add the provided string field to a new entry or update an existing login in KeePass
2. Update your KeePassHTTP plugin to the latest version (https://github.com/alan-null/keepasshttp/releases/) so that the browser extension can automatically store string fields.`;
        }
        else {
          msg = `Please manually save the data as a string field in your KeePass database.

This extension cannot insert or update string fields automatically.`;
        }
        alert(msg);
      }
    }
    catch (e) {
      target.disabled = false;
      console.error(e);
      alert(e.message);
    }
  };
});

// Persist
document.getElementById('format').addEventListener('change', e => {
  chrome.storage.local.set({
    'passkey-ui.format': e.target.value
  });
});
chrome.storage.local.get({
  'passkey-ui.format': 'json'
}).then(prefs => {
  document.querySelector(`input[name=format][value="${prefs['passkey-ui.format']}"]`).checked = true;
});

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}

