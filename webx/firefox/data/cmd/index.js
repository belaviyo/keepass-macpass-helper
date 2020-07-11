'use strict';

const list = document.getElementById('list');
const search = document.querySelector('input[type=search]');

let url;
let tab = {};
let usernames = [];

document.body.dataset.top = window.top === window;

const send = (obj, callback) => chrome.runtime.sendMessage(Object.assign(obj, {
  tabId: tab.id
}), callback);

const storage = {
  get(name) {
    try {
      return localStorage.getItem(name);
    }
    catch (e) {
      return undefined;
    }
  },
  set(name, value) {
    try {
      localStorage.setItem(name, value);
    }
    catch (e) {}
  }
};
const cookie = {
  get host() {
    return (new URL(url)).hostname;
  },
  get: () => {
    const value = storage.get('cookie:' + cookie.host);
    if (value) {
      return value;
    }
    // fallback for older version
    const key = document.cookie.split(`${cookie.host}=`);
    if (key.length > 1) {
      return key[1].split(';')[0];
    }
  },
  set: value => {
    storage.set('cookie:' + cookie.host, value);
  }
};

// styling
try { // https://github.com/belaviyo/keepass-macpass-helper/issues/27
  const style = storage.get('cmd-style');
  if (style) {
    const e = document.createElement('style');
    e.textContent = style;
    document.documentElement.appendChild(e);
  }
}
catch (e) {
  console.warn(e);
}

function add(login, name, password, stringFields) {
  const entry = Object.assign(document.createElement('option'), {
    textContent: login + (name ? ` - ${name}` : ''),
    value: login
  });
  entry.dataset.password = password || '';
  entry.stringFields = stringFields;
  list.appendChild(entry);
}

function submit() {
  const query = search.value || url;
  search.value = query;
  list.textContent = '';
  [...document.getElementById('toolbar').querySelectorAll('input')].forEach(input => {
    if (input.dataset.cmd !== 'close') {
      input.disabled = true;
    }
  });

  send({
    cmd: 'logins',
    url: query
  }, ({error, response}) => {
    if (error) {
      add(error);
    }
    else {
      response.Entries = response.Entries || [];
      response.Entries.forEach(e => add(e.Login, e.Name, e.Password, e.StringFields));
      if (response.Success === 'false') {
        focus();
        add('Something went wrong!');
      }
      else {
        if (response.Entries.length === 0) {
          add('No match!');
        }
        else {// select an item
          const username = response.Entries.map(e => e.Login).filter(u => usernames.indexOf(u) !== -1).shift() ||
            cookie.get() ||
            response.Entries[0].Login;
          list.value = username;
          list.dispatchEvent(new Event('change', {
            bubbles: true
          }));
          if (response.Entries.length === 1) {
            chrome.storage.local.get({
              'auto-login': false,
              'auto-submit': true
            }, prefs => prefs['auto-login'] && document.querySelector('[data-cmd="insert-both"]').dispatchEvent(
              new CustomEvent('click', {
                'detail': prefs['auto-submit'] ? '' : 'no-submit',
                'bubbles': true
              })
            ));
          }
        }
      }
    }
    window.focus();
    list.focus();
    // Firefox bug!
    window.setTimeout(() => list.focus(), 500);
  });
}

function copy(str) {
  document.oncopy = event => {
    event.clipboardData.setData('text/plain', str);
    event.preventDefault();
  };
  document.execCommand('Copy', false, null);
}

document.addEventListener('search', submit);

document.addEventListener('change', e => {
  const target = e.target;
  if (target.nodeName === 'SELECT') {
    const disabled = target.selectedOptions.length === 0 || !target.selectedOptions[0].dataset.password;
    [...document.getElementById('toolbar').querySelectorAll('input')]
      .filter(input => input.dataset.cmd !== 'close')
      .forEach(input => input.disabled = disabled);
  }
});

document.addEventListener('keydown', e => {
  const metaKey = e.metaKey || e.altKey || e.ctrlKey;
  if (e.code === 'Escape') {
    document.querySelector('[data-cmd="close"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyC') {
    document.querySelector('[data-cmd="copy"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyO') {
    document.querySelector('[data-cmd="otp"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyX') {
    document.querySelector('[data-cmd="copy"]').dispatchEvent(
      new CustomEvent('click', {
        'detail': 'password',
        'bubbles': true
      })
    );
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyB') {
    if (e.shiftKey) {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
    else {
      document.querySelector('[data-cmd="insert-both"]').dispatchEvent(
        new CustomEvent('click', {
          'detail': 'no-submit',
          'bubbles': true
        })
      );
    }
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyU') {
    document.querySelector('[data-cmd="insert-login"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyP') {
    document.querySelector('[data-cmd="insert-password"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyF') {
    search.focus();
    e.preventDefault();
  }
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    if (e.target.nodeName === 'SELECT') {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
  }
});

document.addEventListener('click', e => {
  const target = e.target;
  const cmd = target.dataset.cmd || '';
  const alt = e.metaKey || e.ctrlKey;

  // cache
  if (cmd && (cmd.startsWith('insert-') || cmd.startsWith('copy'))) {
    cookie.set(list.value);
  }
  //
  if (cmd && cmd.startsWith('insert-')) {
    const checked = list.selectedOptions[0];
    send({
      cmd,
      detail: cmd === 'insert-both' && alt ? 'no-submit' : e.detail,
      login: list.value,
      password: checked.dataset.password,
      stringFields: checked.stringFields
    });
  }
  else if (cmd && cmd.startsWith('copy')) {
    if (e.detail === 'password' || alt) {
      const checked = list.selectedOptions[0];
      copy(checked.dataset.password);
    }
    else {
      copy(list.value);
    }
    send({
      cmd: 'notify',
      message: (e.detail === 'password' || alt ? 'Password' : 'Login name') + ' is copied to the clipboard'
    });
  }
  else if (cmd === 'otp') {
    const checked = list.selectedOptions[0];
    const otp = checked.stringFields.filter(o => o.Key === 'otp')
      .map(o => o.Value).shift();
    const sotp = checked.stringFields.filter(o => o.Key === 'sotp')
      .map(o => o.Value).shift();
    if (otp || sotp) {
      send({
        cmd: sotp ? 'cmd-sotp' : 'cmd-otp',
        value: sotp || otp
      });
    }
    else {
      send({
        cmd: 'notify',
        message: 'No string-field entry with "otp" key is detected. To generate one-time password tokens, save a new string-field entry with "otp" key and "key=OTP_SECRET" value.'
      });
    }
  }
  else if (cmd === 'close') {
    send({
      cmd: 'close-me',
      tabId: tab.id
    });
  }
  if (cmd === 'close' || cmd.startsWith('insert-')) {
    if (window.top === window) {
      window.close();
    }
  }
  list.focus();
});

// keep focus
window.addEventListener('blur', () => window.setTimeout(window.focus, 0));

// init
const init = t => {
  tab = t;

  send({
    cmd: 'fetch-guesses'
  }, resp => {
    usernames = resp || [];
    [...list.querySelectorAll('option')].map(o => o.value)
      .filter(u => usernames.indexOf(u) !== -1)
      .forEach(u => list.value = u);
  });

  url = tab.url;
  search.value = url;
  submit();
};
if (window.top === window) {
  send({cmd: 'command'}, () => {
    chrome.tabs.query({
      currentWindow: true,
      active: true
    }, ([tab]) => init(tab));
  });
}
else {
  send({
    cmd: 'introduce-me'
  }, init);
}

// dbl-click
list.addEventListener('dblclick', () => {
  document.querySelector('[data-cmd="insert-both"]').click();
});

// check localhost access
chrome.storage.local.get({
  engine: 'keepass',
  host: 'http://localhost:19455'
}, prefs => {
  if (prefs.engine === 'keepass') {
    const o = '*://' + (new URL(prefs.host)).hostname + '/';
    chrome.permissions.contains({
      origins: [o]
    }, granted => {
      if (granted === false) {
        const parent = document.getElementById('host-access');
        parent.classList.remove('hidden');
        parent.querySelector('input').addEventListener('click', () => chrome.permissions.request({
          origins: [o]
        }, granted => {
          if (granted) {
            parent.classList.add('hidden');
          }
        }));
      }
    });
  }
});
