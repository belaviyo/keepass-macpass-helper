'use strict';

const toast = (msg, callback = () => {}) => {
  const e = document.getElementById('toast');
  e.textContent = msg;
  window.clearTimeout(toast.id);
  toast.id = setTimeout(() => {
    e.textContent = '';
    callback();
  }, 1000);
};

if (/Firefox/.test(navigator.userAgent)) {
  [...document.querySelectorAll('.chrome')].forEach(e => e.classList.add('hidden'));
}

let restart = false;
document.getElementById('id').textContent = chrome.runtime.id;

document.getElementById('keepassxc').addEventListener('change', e => {
  if (e.target.checked) {
    chrome.permissions.request({
      permissions: ['nativeMessaging']
    }, granted => {
      if (granted === false) {
        document.getElementById('keepass').checked = true;
      }
      else {
        // bug?
        restart = true;
      }
    });
  }
});

document.getElementById('minilogin').addEventListener('change', e => {
  if (e.target.checked) {
    chrome.permissions.request({
      permissions: ['declarativeContent']
    }, granted => {
      if (granted === false) {
        e.target.checked = false;
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
    'embedded': false,
    'auto-login': false,
    'auto-submit': true,
    'faqs': true,
    'engine': 'keepass',
    'minilogin': false,
    'xc-native-id': 'org.keepassxc.keepassxc_browser'
  }, prefs => {
    document.getElementById('minilogin').checked = prefs.minilogin;
    document.getElementById(prefs.engine).checked = true;
    document.getElementById('cmd-style').value = localStorage.getItem('cmd-style') || '';
    document.getElementById('save-dialog-style').value = localStorage.getItem('save-dialog-style') || '';
    document.getElementById('host').value = prefs.host;
    document.getElementById('format').value = prefs.format;
    document.getElementById('charset').value = prefs.charset;
    document.getElementById('length').value = prefs.length;
    document.getElementById('embedded').checked = prefs.embedded;
    document.getElementById('auto-login').checked = prefs['auto-login'];
    document.getElementById('auto-submit-auto-login').checked = localStorage.getItem('auto-submit') === 'true';
    document.getElementById('auto-submit').checked = prefs['auto-submit'];
    document.getElementById('faqs').checked = prefs.faqs;
    document.getElementById('json').value = JSON.stringify(
      JSON.parse(localStorage.getItem('json') || '[]'),
      null,
      '  '
    );
    document.getElementById('xc-native-id').value = prefs['xc-native-id'];
  });
}

function save() {
  localStorage.setItem('cmd-style', document.getElementById('cmd-style').value);
  localStorage.setItem('save-dialog-style', document.getElementById('save-dialog-style').value);

  if (chrome.declarativeContent) {
    const e = document.getElementById('minilogin');
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      if (e.checked) {
        chrome.declarativeContent.onPageChanged.addRules([{
          conditions: [
            new chrome.declarativeContent.PageStateMatcher({
              css: ['input[type="password"]']
            })
          ],
          actions: [
            new chrome.declarativeContent.RequestContentScript({
              js: ['/data/minilogin/inject.js']
            })
          ]
        }]);
      }
    });
  }

  chrome.storage.local.set({
    'minilogin': document.getElementById('minilogin').checked,
    'host': document.getElementById('host').value,
    'format': document.getElementById('format').value,
    'charset': document.getElementById('charset').value,
    'length': Math.max(document.getElementById('length').value, 3),
    'embedded': document.getElementById('embedded').checked,
    'auto-login': document.getElementById('auto-login').checked,
    'auto-submit': document.getElementById('auto-submit').checked,
    'faqs': document.getElementById('faqs').checked,
    'engine': document.querySelector('[name="method"]:checked').id,
    'xc-native-id': document.getElementById('xc-native-id').value
  }, () => {
    toast('Options saved.', () => {
      if (restart) {
        chrome.runtime.reload();
        window.close();
      }
    });
  });

  let json = [];
  try {
    json = JSON.parse(document.getElementById('json').value.trim() || '[]');
  }
  catch (e) {
    chrome.notifications.create({
      title: 'KeePassHelper',
      type: 'basic',
      iconUrl: '/data/icons/48.png',
      message: e.message
    });
  }
  localStorage.setItem('json', JSON.stringify(json));

  const checked = document.getElementById('auto-submit-auto-login').checked;
  localStorage.setItem('auto-submit', checked);
  chrome.runtime.sendMessage({
    'cmd': 'register-login',
    'auto-submit': checked,
    json
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

document.getElementById('permission').addEventListener('click', () => chrome.windows.create({
  url: '/data/permission/index.html',
  type: 'popup',
  width: 400,
  height: 250,
  left: screen.availLeft + Math.round((screen.availWidth - 400) / 2),
  top: screen.availTop + Math.round((screen.availHeight - 250) / 2)
}));


document.getElementById('check').addEventListener('click', () => {
  try {
    const url = document.getElementById('host').value;
    const o = '*://' + (new URL(url)).hostname + '/';
    chrome.permissions.request({
      permissions: ['webNavigation'],
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

//
document.getElementById('xc-help').addEventListener('click', () => {
  document.querySelector('[for="xc-help"').classList.toggle('hidden');
});
