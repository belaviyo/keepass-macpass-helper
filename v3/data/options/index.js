/* global KWPASS */
'use strict';

const KEYS = {
  'copy': {
    code: 'KeyC',
    meta: ['meta'],
    click: 'click'
  },
  'otp': {
    code: 'KeyO',
    meta: ['meta']
  },
  'password': {
    code: 'KeyX',
    meta: ['meta'],
    click: 'ctrl-click'
  },
  'insert-both': {
    code: 'KeyB',
    meta: ['meta', 'shift'],
    click: 'click'
  },
  'insert-both-no-submit': {
    code: 'KeyB',
    meta: ['meta'],
    click: 'ctrl-click'
  },
  'insert-login': {
    code: 'KeyU',
    meta: ['meta']
  },
  'insert-password': {
    code: 'KeyP',
    meta: ['meta']
  },
  'search': {
    code: 'KeyF',
    meta: ['meta']
  },
  'ssdb': {
    code: 'KeyD',
    meta: ['meta']
  },
  'passkey': {
    code: 'KeyK',
    meta: ['meta']
  }
};

const toast = (msg, callback = () => {}, timeout = 2000) => {
  const e = document.getElementById('toast');
  e.textContent = msg;
  window.clearTimeout(toast.id);
  toast.id = setTimeout(() => {
    e.textContent = '';
    callback();
  }, timeout);
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
    'charset-1': 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
    'charset-2': '!@#$%^&*()-_+=',
    'length-1': 10,
    'length-2': 2,
    'auto-login': false,
    'auto-submit': true,
    'faqs': true,
    'engine': 'keepass',
    'xc-native-id': 'org.keepasshelper.extension',
    'sort': {
      'active': true,
      'key': 'Login',
      'direction': 'az'
    },
    'keys': KEYS
  }, prefs => {
    document.getElementById(prefs.engine).checked = true;
    // make sure we have access to the native client
    if (prefs.engine === 'keepassxc') {
      if (!chrome.runtime.sendNativeMessage) {
        document.getElementById('keepass').checked = true;
      }
    }
    document.getElementById('cmd-style').value = localStorage.getItem('cmd-style') || '';
    document.getElementById('save-dialog-style').value = localStorage.getItem('save-dialog-style') || '';
    document.getElementById('host').value = prefs.host;
    document.getElementById('format').value = prefs.format;
    document.getElementById('charset-1').value = prefs['charset-1'];
    document.getElementById('length-1').value = prefs['length-1'];
    document.getElementById('charset-2').value = prefs['charset-2'];
    document.getElementById('length-2').value = prefs['length-2'];
    document.getElementById('auto-login').checked = prefs['auto-login'];
    document.getElementById('auto-submit-auto-login').checked = localStorage.getItem('auto-submit') === 'true';
    document.getElementById('auto-submit').checked = prefs['auto-submit'];
    document.getElementById('faqs').checked = prefs.faqs;
    document.getElementById('xc-native-id').value = prefs['xc-native-id'];
    document.getElementById('sort.active').checked = prefs.sort.active;
    document.getElementById('sort.key').value = prefs.sort.key;
    document.getElementById('sort.direction').value = prefs.sort.direction;

    for (const [name, o] of Object.entries(prefs.keys)) {
      const parent = document.querySelector(`[data-shortcut="${name}"]`);
      const [shift, meta] = parent.querySelectorAll('label input');
      shift.checked = o.meta.includes('shift');
      meta.checked = o.meta.includes('meta');
      parent.querySelector('input[type=text]').value = o.code;

      const select = parent.querySelector('select');
      if (select) {
        select.value = 'click' in o ? o.click : KEYS[name].click;
      }
    }
  });
}

async function save() {
  localStorage.setItem('cmd-style', document.getElementById('cmd-style').value);
  localStorage.setItem('save-dialog-style', document.getElementById('save-dialog-style').value);

  const ps = await chrome.storage.local.get({
    keys: KEYS
  });
  const validKeys = [...document.getElementById('keys').options].map(o => o.value);
  for (const name of Object.keys(ps.keys)) {
    const parent = document.querySelector(`[data-shortcut="${name}"]`);
    const [shift, meta] = parent.querySelectorAll('label input');
    const code = parent.querySelector('input[type=text]').value;

    if (code !== '' && validKeys.includes(code) === false) {
      const msg = 'Invalid key code for ' + name + '. Please select a value from the suggestion list (e.g., "KeyC")';
      return toast(msg, undefined, 10000);
    }

    ps.keys[name].meta = [];
    if (shift.checked) {
      ps.keys[name].meta.push('shift');
    }
    if (meta.checked || ps.keys[name].meta.length === 0) {
      ps.keys[name].meta.push('meta');
    }
    ps.keys[name].code = code;

    const select = parent.querySelector('select');
    if (select) {
      ps.keys[name].click = select.value;
    }
  }

  chrome.storage.local.set({
    'keys': ps.keys,
    'host': document.getElementById('host').value,
    'format': document.getElementById('format').value,
    'charset-1': document.getElementById('charset-1').value,
    'length-1': Math.max(document.getElementById('length-1').value, 3),
    'charset-2': document.getElementById('charset-2').value,
    'length-2': Math.max(document.getElementById('length-2').value, 0),
    'auto-login': document.getElementById('auto-login').checked,
    'auto-submit': document.getElementById('auto-submit').checked,
    'faqs': document.getElementById('faqs').checked,
    'engine': document.querySelector('[name="method"]:checked').id,
    'xc-native-id': document.getElementById('xc-native-id').value,
    'sort': {
      'active': document.getElementById('sort.active').checked,
      'key': document.getElementById('sort.key').value,
      'direction': document.getElementById('sort.direction').value
    }
  }, () => {
    toast('Options saved');
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

document.addEventListener('change', e => {
  const select = e.target;
  if (select.tagName === 'SELECT' && select.closest('.m2')) {
    const parent = select.closest('[data-shortcut]');
    const name = parent.dataset.shortcut;
    let partnerName;

    if (name === 'copy') partnerName = 'password';
    else if (name === 'password') partnerName = 'copy';
    else if (name === 'insert-both') partnerName = 'insert-both-no-submit';
    else if (name === 'insert-both-no-submit') partnerName = 'insert-both';

    if (partnerName) {
      const partnerSelect = document.querySelector(`[data-shortcut="${partnerName}"] select`);
      if (partnerSelect) {
        partnerSelect.value = select.value === 'click' ? 'ctrl-click' : 'click';
      }
    }
  }
});

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

const cc = (target, content, value) => {
  target.disabled = true;
  target.textContent = 'Done!';
  clearTimeout(cc.id);
  cc.id = setTimeout(() => {
    target.textContent = content;
    target.value = value;
    target.disabled = false;
  }, 2000);
};
document.getElementById('all-frames').addEventListener('click', e => {
  if (e.target.value === 'reverse') {
    chrome.permissions.remove({
      origins: ['<all_urls>']
    });
    cc(e.target, 'Access Remote Frames Permission', 'direct');
  }
  else {
    chrome.permissions.request({
      origins: ['<all_urls>']
    }).then(granted => {
      if (granted) {
        cc(e.target, 'Revoke Remote Frames Permission', 'reverse');
      }
    });
  }
});
// hide granted permissions
chrome.permissions.contains({
  origins: ['<all_urls>']
}, granted => {
  if (granted) {
    const button = document.getElementById('all-frames');
    button.textContent = 'Revoke Remote Frames Permission';
    button.value = 'reverse';
  }
});
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
      await kwpass.dettach();
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
      await kwpass.dettach();
      await kwpass.attach(...args);
    }
    else {
      throw Error('Please provide the database file and key file (optional)');
    }
    toast('Database is stored');
    chrome.storage.session.remove('kw:password');
  }).catch(e => toast(e.message));
};
document.getElementById('kwpass-remove').addEventListener('click', () => {
  const next = () => kwpass.dettach().then(() => {
    chrome.runtime.sendMessage({
      cmd: 'kwpass-remove'
    });
    toast('Database is removed');
  }).catch(e => toast('Error: ' + e.message));
  if (kwpass.db) {
    next();
  }
  else {
    kwpass.prepare().then(next).catch(e => {
      console.error(e);
      toast(e.message);
    });
  }
});

document.getElementById('kwpass-download').addEventListener('click', async () => {
  document.getElementById('prompt').showModal();
  document.querySelector('#prompt input').value = '';

  const password = await new Promise(resolve => {
    document.querySelector('#prompt button').onclick = e => {
      e.target.closest('dialog').close();
      resolve('');
    };
    document.querySelector('#prompt form').onsubmit = e => {
      e.preventDefault();
      e.target.closest('dialog').close();
      resolve(document.querySelector('#prompt input').value);
    };
  });

  if (password) {
    const next = () => kwpass.open(password).then(() => kwpass.export()).catch(e => {
      toast('[Error] ' + e.message);
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

document.getElementById('kwpass-create').addEventListener('click', async () => {
  document.getElementById('prompt').showModal();
  document.querySelector('#prompt input').value = '';

  const password = await new Promise(resolve => {
    document.querySelector('#prompt button').onclick = e => {
      e.target.closest('dialog').close();
      resolve('');
    };
    document.querySelector('#prompt form').onsubmit = e => {
      e.preventDefault();
      e.target.closest('dialog').close();
      resolve(document.querySelector('#prompt input').value);
    };
  });

  if (password) {
    try {
      await kwpass.prepare();
      await kwpass.dettach();
      await kwpass.create(password);
      toast('Database is ready');
    }
    catch (e) {
      console.error(e);
      toast(e.message);
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
  let url = 'https://chromewebstore.google.com/detail/keepasshelper-password-ma/jgnfghanfbjmimbdmnjfofnbcgpkbegj/reviews';
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

// Secure Synced Storage
document.getElementById('ssdb-lock').onclick = () => chrome.storage.session.remove('ssdb-exported-key');
document.getElementById('ssdb-export').onclick = () => chrome.storage.sync.get(null, prefs => {
  const text = JSON.stringify(prefs, null, '  ');
  const blob = new Blob([text], {type: 'application/json'});
  const objectURL = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href: objectURL,
    type: 'application/json',
    download: 'keepass-helper-secure-synced-storage.json'
  }).dispatchEvent(new MouseEvent('click'));
  setTimeout(() => URL.revokeObjectURL(objectURL));
});
document.getElementById('ssdb-import').addEventListener('click', () => {
  const input = document.createElement('input');
  input.style.display = 'none';
  input.type = 'file';
  input.accept = '.json';
  input.acceptCharset = 'utf-8';
  input.initialValue = input.value;

  document.body.appendChild(input);

  input.onchange = () => {
    if (input.value !== input.initialValue) {
      const file = input.files[0];
      if (file.size > 10e6) {
        return console.warn('The file is too large!');
      }
      const reader = new FileReader();
      reader.onloadend = event => {
        input.remove();
        const prefs = JSON.parse(event.target.result);
        chrome.storage.sync.set(prefs, () => {
          toast('Synced credentials are imported');
        });
      };
      reader.readAsText(file, 'utf-8');
    }
  };
  input.click();
});
document.getElementById('ssdb-clear').onclick = async () => {
  if (confirm(`Are you are you want to remove all credentials in the browser's synced storage?`)) {
    const prefs = await chrome.storage.sync.get(null);
    for (const key of Object.keys(prefs)) {
      if (key.startsWith('A:')) {
        await chrome.storage.sync.remove(key);
      }
    }
    toast('Your passwords in the synced storage are permanently removed');
  }
};

document.getElementById('keepassxc-manifest').onclick = () => {
  const path =
    navigator.platform.startsWith('Win') ?
      'C:\\Program Files\\KeePassXC\\keepassxc-proxy.exe' : navigator.platform.startsWith('Mac') ?
        '/Applications/KeePassXC.app/Contents/MacOS/keepassxc-proxy' : '/usr/bin/keepassxc-proxy';

  const name = document.getElementById('xc-native-id').value || 'org.keepasshelper.extension';
  const manifest = {
    'description': 'KeePassHelper integration with native messaging support',
    'type': 'stdio',
    name,
    path
  };
  if (/Firefox/.test(navigator.userAgent)) {
    manifest['allowed_extensions'] = [chrome.runtime.id];
  }
  else {
    manifest['allowed_origins'] = [`chrome-extension://${chrome.runtime.id}/`];
  }
  const text = JSON.stringify(manifest, null, '  ');
  const blob = new Blob([text], {type: 'application/json'});
  const href = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href,
    type: 'application/json',
    download: name + '.json'
  }).dispatchEvent(new MouseEvent('click'));
  setTimeout(() => URL.revokeObjectURL(href));

  toast('Check the path and read the FAQ to place the file in the correct directory');
};
