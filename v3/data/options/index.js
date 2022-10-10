/* global KWPASS */
'use strict';

const toast = (msg, callback = () => {}) => {
  const e = document.getElementById('toast');
  e.textContent = msg;
  window.clearTimeout(toast.id);
  toast.id = setTimeout(() => {
    e.textContent = '';
    callback();
  }, 2000);
};

if (/Firefox/.test(navigator.userAgent)) {
  [...document.querySelectorAll('.chrome')].forEach(e => e.classList.add('hidden'));
}

document.getElementById('keepassxc').addEventListener('change', e => {
  if (e.target.checked) {
    chrome.permissions.request({
      permissions: ['nativeMessaging']
    }, granted => {
      if (granted === false) {
        document.getElementById('keepass').checked = true;
      }
    });
  }
});

function restore() {
  chrome.storage.local.get({
    'host': 'http://localhost:19455',
    'foramt': '[login] - [name]',
    'charset': 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
    'length': 12,
    'auto-login': false,
    'auto-submit': true,
    'faqs': true,
    'engine': 'keepass',
    'xc-native-id': 'org.keepasshelper.extension'
  }, prefs => {
    document.getElementById(prefs.engine).checked = true;
    document.getElementById('cmd-style').value = localStorage.getItem('cmd-style') || '';
    document.getElementById('save-dialog-style').value = localStorage.getItem('save-dialog-style') || '';
    document.getElementById('host').value = prefs.host;
    document.getElementById('format').value = prefs.format;
    document.getElementById('charset').value = prefs.charset;
    document.getElementById('length').value = prefs.length;
    document.getElementById('auto-login').checked = prefs['auto-login'];
    document.getElementById('auto-submit-auto-login').checked = localStorage.getItem('auto-submit') === 'true';
    document.getElementById('auto-submit').checked = prefs['auto-submit'];
    document.getElementById('faqs').checked = prefs.faqs;
    document.getElementById('xc-native-id').value = prefs['xc-native-id'];
  });
}

function save() {
  localStorage.setItem('cmd-style', document.getElementById('cmd-style').value);
  localStorage.setItem('save-dialog-style', document.getElementById('save-dialog-style').value);

  chrome.storage.local.set({
    'host': document.getElementById('host').value,
    'format': document.getElementById('format').value,
    'charset': document.getElementById('charset').value,
    'length': Math.max(document.getElementById('length').value, 3),
    'auto-login': document.getElementById('auto-login').checked,
    'auto-submit': document.getElementById('auto-submit').checked,
    'faqs': document.getElementById('faqs').checked,
    'engine': document.querySelector('[name="method"]:checked').id,
    'xc-native-id': document.getElementById('xc-native-id').value
  }, () => {
    toast('Options saved');
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);
document.getElementById('example').addEventListener('click', () => {
  document.getElementById('json').value = JSON.stringify([{
    'url': 'https://github.com/login',
    'username': 'test.user@gmail.com'
  }], null, '  ');
});
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.paypal.me/addondonation/10usd'
}));

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast('Double-click to reset!');
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});

// usage
document.getElementById('usage').addEventListener('click', () => chrome.tabs.create({
  url: 'https://www.youtube.com/watch?v=L1Ze02XUi34'
}));

document.getElementById('check').addEventListener('click', () => {
  try {
    const url = document.getElementById('host').value;
    const o = '*://' + (new URL(url)).hostname + '/';
    chrome.permissions.request({
      origins: [o]
    }, granted => {
      if (granted) {
        fetch(url).then(() => toast('Looks Good')).catch(e => toast(e.message));
      }
      else {
        toast('Permission is not granted');
      }
    });
  }
  catch (e) {
    toast(e.message);
  }
});

document.getElementById('all-frames').addEventListener('click', () => chrome.permissions.request({
  origins: ['<all_urls>']
}));
// hide granted permissions
chrome.permissions.contains({
  origins: ['<all_urls>']
}, granted => granted && document.getElementById('all-frames').classList.add('hidden'));
chrome.permissions.contains({
  permissions: ['webNavigation'],
  origins: ['<all_urls>']
}, granted => granted && document.getElementById('permission').classList.add('hidden'));

const kwpass = new KWPASS();

document.getElementById('kwpass-file').onclick = () => {
  const read = file => new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(new Uint8Array(reader.result));
    reader.readAsArrayBuffer(file);
  });
  const open = () => new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => resolve(input.files);
    input.click();
  });

  open().then(async files => {
    if (files.length === 1) {
      const file = await read(files[0]);
      await kwpass.prepare();
      await kwpass.attach(file);
    }
    else if (files.length === 2) {
      const key = [...files].filter(f => f.name.includes('.key')).shift();
      if (!key) {
        throw Error('Cannot detect the key file (*.key*)');
      }
      const file = [...files].filter(f => f !== key).shift();

      const args = [
        await read(file),
        await read(key)
      ];
      await kwpass.prepare();
      await kwpass.attach(...args);
    }
    else {
      throw Error('Please provide the database file and key file (optional)');
    }
    toast('Database is stored');
    chrome.storage.session.remove('kw:password');
  }).catch(e => alert(e.message));
};
document.getElementById('kwpass-remove').addEventListener('click', () => {
  const next = () => kwpass.dettach().then(() => {
    toast('Database is removed');
    chrome.runtime.sendMessage({
      cmd: 'kwpass-remove'
    });
  }).catch(e => toast('Error: ' + e.message));
  if (kwpass.db) {
    next();
  }
  else {
    kwpass.prepare().then(next);
  }
});

document.getElementById('kwpass-download').addEventListener('click', () => {
  const password = prompt('Enter the password', '');
  if (password) {
    const next = () => kwpass.open(password).then(() => kwpass.export()).catch(e => {
      toast('Error: ' + e.message);
      console.warn(e);
    });
    if (kwpass.db) {
      next();
    }
    else {
      kwpass.prepare().then(next);
    }
  }
});

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}

// rate
document.getElementById('rate').onclick = () => {
  let url = 'https://chrome.google.com/webstore/detail/keepassmacpass-helper/jgnfghanfbjmimbdmnjfofnbcgpkbegj/reviews/';
  if (/Edg/.test(navigator.userAgent)) {
    url = 'https://microsoftedge.microsoft.com/addons/detail/bfmglfdehkodoiinbclgoppembjfgjkj';
  }
  else if (/Firefox/.test(navigator.userAgent)) {
    url = 'https://addons.mozilla.org/firefox/addon/keepasshelper/reviews/';
  }
  else if (/OPR/.test(navigator.userAgent)) {
    url = 'https://addons.opera.com/extensions/details/keepasshelper/';
  }

  chrome.storage.local.set({
    'rate': false
  }, () => chrome.tabs.create({
    url
  }));
};
