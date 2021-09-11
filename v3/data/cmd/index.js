/* global engine, safe */
'use strict';

const list = document.getElementById('list');
const search = document.querySelector('input[type=search]');
const psbox = document.getElementById('password-needed');

let url;
let tab = {};
let usernames = [];

const notify = e => {
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: 'E'
  });
  chrome.action.setTitle({
    tabId: tab.id,
    title: e.message || e
  });
};

const decrypt = async sotp => {
  psbox.querySelector('span').textContent = 'Enter password to decrypt the secure OTP';
  psbox.classList.remove('hidden');
  psbox.querySelector('input').focus();

  const password = await new Promise(resolve => psbox.onsubmit = e => {
    e.preventDefault();
    resolve(psbox.querySelector('input').value);
  });
  psbox.classList.add('hidden');

  return await safe.decrypt(sotp, password);
};

document.body.dataset.top = window.top === window;

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
  },
  remote: o => new Promise(resolve => chrome.storage.local.get(o, resolve))
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
  if (password) {
    entry.title = `Username: ${login}
Name: ${name || ''}
String Fields: ${(stringFields || []).length}`;
  }
  else {
    entry.title = login;
  }

  list.appendChild(entry);
}

async function submit() {
  let query = search.value = search.value || url;
  if (query.indexOf('://') === -1) {
    try {
      // try to construct and validate URL from user input
      new URL('https://' + query);
      search.value = query = 'https://' + query;
    }
    catch (e) {}
  }

  list.textContent = '';
  [...document.getElementById('toolbar').querySelectorAll('input')].forEach(input => {
    input.disabled = true;
  });

  try {
    const response = await engine.search({
      url: query
    });
    if (response.Entries.length === 0) {
      add('No match!');
    }
    else { // select an item
      response.Entries.forEach(e => add(e.Login, e.Name, e.Password, e.StringFields));

      const username = response.Entries.map(e => e.Login).filter(u => usernames.indexOf(u) !== -1).shift() ||
        cookie.get() ||
        response.Entries[0].Login;
      list.value = username;
      list.dispatchEvent(new Event('change', {
        bubbles: true
      }));

      if (response.Entries.length === 1) {
        const prefs = await storage.remote({
          'auto-login': false,
          'auto-submit': true
        });
        if (prefs['auto-login']) {
          document.querySelector('[data-cmd="insert-both"]').dispatchEvent(new CustomEvent('click', {
            'detail': prefs['auto-submit'] ? '' : 'no-submit',
            'bubbles': true
          }));
        }
      }
    }
    window.focus();
    list.focus();
  }
  catch (e) {
    console.warn(e);
    add(e.message);
  }
}

document.addEventListener('search', submit);

document.addEventListener('change', e => {
  const target = e.target;
  if (target.nodeName === 'SELECT') {
    const disabled = target.selectedOptions.length === 0 || !target.selectedOptions[0].dataset.password;
    [...document.getElementById('toolbar').querySelectorAll('input')]
      .forEach(input => input.disabled = disabled);
  }
});

document.addEventListener('keydown', e => {
  const metaKey = e.metaKey || e.altKey || e.ctrlKey;
  if (metaKey && e.code === 'KeyC') {
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
    search.select();
    e.preventDefault();
  }
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    if (e.target.nodeName === 'SELECT') {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
  }
});

const insert = {};
insert.fields = async stringFields => {
  // do we need to use otp or sotp
  if (stringFields.some(o => typeof(o.Value) === 'string' && o.Value.indexOf('{{TOTP}') !== -1)) {
    let otp = stringFields.filter(o => o.Key === 'KPH: otp' || o.Key === 'KPH:otp' || o.Key === 'otp').shift();
    const sotp = stringFields.filter(o => o.Key === 'KPH: sotp' || o.Key === 'KPH:sotp' || o.Key === 'sotp').shift();

    try {
      if (sotp) {
        otp = await decrypt(sotp.Value);
      }
      else {
        otp = otp.Value;
      }
      if (otp) {
        const s = engine.otp(otp);
        for (const o of stringFields) {
          o.Value = o.Value.replace('{{TOTP}}', s);
        }
      }
    }
    catch (e) {
      console.warn(e);
      alert('Cannot replace {{TOTP}}; ' + (e.message || 'invalid password'));
    }
  }

  return await chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
      allFrames: true
    },
    func: stringFields => {
      const {aElement} = window;
      if (!aElement) {
        return false;
      }
      const form = window.detectForm(aElement);

      let inserted = false;
      if (form) {
        for (const o of stringFields) {
          const custom = form.querySelector('[id="' + o.Key + '"]') || form.querySelector('[name="' + o.Key + '"]');
          if (custom) {
            custom.focus();
            document.execCommand('selectAll', false, '');
            const v = document.execCommand('insertText', false, o.Value);
            if (!v) {
              try {
                custom.value = o.Value;
              }
              catch (e) {}
            }
            custom.dispatchEvent(new Event('change', {bubbles: true}));
            custom.dispatchEvent(new Event('input', {bubbles: true}));
            inserted = true;
          }
        }
        return inserted;
      }
    },
    args: [stringFields]
  });
};

insert.username = username => chrome.scripting.executeScript({
  target: {
    tabId: tab.id,
    allFrames: true
  },
  func: username => {
    const once = aElement => {
      // insert username is requested; but password field is selected
      if (aElement.type === 'password') {
        const form = window.detectForm(aElement);
        if (form) {
          const e = [ // first use type=email
            ...form.querySelectorAll('input[type=email]'),
            ...form.querySelectorAll('input[type=text]')
          ].filter(e => e.offsetParent).shift();

          if (e) {
            aElement = e;
            aElement.focus();
          }
        }
      }
      const r = document.execCommand('selectAll', false, '') &&
        document.execCommand('insertText', false, username);
      if (r === false) {
        aElement.value = username;
      }
      aElement.dispatchEvent(new Event('change', {bubbles: true}));
      aElement.dispatchEvent(new Event('input', {bubbles: true}));
    };
    const {aElement} = window;

    if (aElement) {
      [aElement].flat().forEach(e => {
        e.focus();
        once(e);
      });

      return true;
    }
  },
  args: [username]
});
insert.password = password => chrome.scripting.executeScript({
  target: {
    tabId: tab.id,
    allFrames: true
  },
  func: password => {
    const es = [];
    const aElement = window.aElement;
    if (!aElement) {
      return;
    }
    // try to find the password field
    for (const e of [[aElement]].flat()) {
      if (e.type === 'password') {
        es.push(e);
      }
    }
    if (es.length === 0) {
      const form = window.detectForm(aElement);
      if (form) {
        for (const e of [...form.querySelectorAll('[type=password]')]) {
          if (e.offsetParent) {
            es.push(e);
          }
        }
      }
    }
    let inserted = false;
    for (const e of es) {
      e.focus();
      let v = false;
      // only insert if password element is focused
      if (document.activeElement === e) {
        document.execCommand('selectAll', false, '');
        v = document.execCommand('insertText', false, password);
      }
      if (!v) {
        try {
          e.value = password;
        }
        catch (e) {}
      }
      e.dispatchEvent(new Event('change', {bubbles: true}));
      e.dispatchEvent(new Event('input', {bubbles: true}));
      inserted = true;
    }
    return inserted;
  },
  args: [password]
});
insert.submit = () => chrome.scripting.executeScript({
  target: {
    tabId: tab.id,
    allFrames: true
  },
  func: () => {
    const {aElement} = window;
    const form = window.detectForm(aElement);
    if (form) {
      const button =
        form.querySelector('input[type=submit], button[type=submit]') ||
        form.querySelector('input[name=submit], button[name=submit]') ||
        form.querySelector('input[name=Submit], button[name=Submit]') ||
        form.querySelector('button:not([type=reset i]):not([type=button i])');

      if (button) {
        button.click();
      }
      else {
        // try to submit with Enter key on the password element
        const enter = name => new KeyboardEvent(name, {
          keyCode: 13,
          bubbles: true
        });
        aElement.dispatchEvent(enter('keypress'));
        aElement.dispatchEvent(enter('keydown'));
        aElement.dispatchEvent(enter('keyup'));
      }
    }
  }
});

document.addEventListener('click', async e => {
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
    // insert helper function
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
        allFrames: true
      },
      func: () => {
        window.detectForm = e => {
          const form = e.closest('form');
          if (form) {
            return form;
          }
          // what if there is no form element
          let parent = e;
          for (let i = 0; i < 5; i += 1) {
            parent = parent.parentElement;
            if (parent.querySelector('[type=password]')) {
              return parent;
            }
          }
          return parent;
        };
      }
    });

    let inserted = false;
    // insert StringFields
    if (checked.stringFields) {
      const r = await insert.fields(checked.stringFields);
      inserted = inserted || r.reduce((p, c) => p || c.result, false);
    }
    // insert username
    if (cmd === 'insert-login' || cmd === 'insert-both') {
      const r = await insert.username(list.value);
      inserted = inserted || r.reduce((p, c) => p || c.result, false);
    }
    // insert password
    if (cmd === 'insert-password' || cmd === 'insert-both') {
      const r = await insert.password(checked.dataset.password);
      inserted = inserted || r.reduce((p, c) => p || c.result, false);
    }
    if (inserted !== true) {
      // do we have a CORS frame
      const r = await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: () => [...document.querySelectorAll('iframe[src]')]
          .map(e => e.src)
          .filter(s => s && s.startsWith('http') && s.startsWith(location.origin) === false)
      });
      const origins = r[0].result;
      if (origins.length) {
        chrome.permissions.request({
          origins
        }, granted => {
          if (granted) {
            e.target.dispatchEvent(new Event('click', {
              bubbles: true
            }));
          }
        });
      }
      else {
        notify('Cannot find any login forms on this page');
      }
    }
    // submit
    if (cmd === 'insert-both' && alt === false && inserted) {
      await insert.submit();
    }
    window.close();
  }
  else if (cmd && cmd.startsWith('copy')) {
    let content = list.value;
    if (e.detail === 'password' || alt) {
      const checked = list.selectedOptions[0];
      content = checked.dataset.password;
    }
    navigator.clipboard.writeText(content).then(() => window.close()).catch(e => alert(e.message));
  }
  else if (cmd === 'otp') {
    const checked = list.selectedOptions[0];
    let otp = checked.stringFields.filter(o => o.Key === 'otp')
      .map(o => o.Value).shift();
    const sotp = checked.stringFields.filter(o => o.Key === 'sotp')
      .map(o => o.Value).shift();

    try {
      if (sotp) {
        otp = await decrypt(sotp);
      }
      if (otp) {
        const s = engine.otp(otp);
        await navigator.clipboard.writeText(s);
        window.close();
      }
      else {
        alert(`No string-field entry with either "otp" or "sotp" key is detected.

To generate one-time password tokens, save a new string-field entry with "KPH: otp" name and SECRET as value.`);
      }
    }
    catch (e) {
      console.warn(e);
      alert(e.message || 'cannot decrypt');
    }
  }
  else if (cmd === 'options-page') {
    chrome.runtime.openOptionsPage();
  }
  if (psbox.classList.contains('hidden') === true && e.target.type !== 'search') {
    list.focus();
  }
});

// keep focus
window.addEventListener('blur', () => window.setTimeout(window.focus, 0));

// init
(async () => {
  // prepare the engine engine
  const prefs = await storage.remote({
    engine: 'keepass'
  });
  try {
    await engine.prepare(prefs.engine);

    if (prefs.engine === 'kwpass') {
      psbox.querySelector('span').textContent = 'Unlock Internal Database';
      psbox.classList.remove('hidden');
      psbox.querySelector('input').focus();

      const password = (await storage.remote({
        'kw:password': ''
      }))['kw:password'] || await new Promise(resolve => psbox.onsubmit = e => {
        e.preventDefault();
        resolve(psbox.querySelector('input').value);
      });
      psbox.classList.add('hidden');

      await engine.core.open(password);

      chrome.storage.local.set({
        'kw:password': password
      });
    }
    // select tab
    const tabs = await new Promise(resolve => chrome.tabs.query({
      currentWindow: true,
      active: true
    }, resolve));
    if (tabs.length < 1) {
      throw Error('Cannot detect active tab');
    }
    tab = tabs[0];
    search.value = url = tab.url;

    const r = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
        allFrames: true
      },
      files: ['data/cmd/inject.js']
    });
    usernames = r.map(r => r.result).flat().filter((s, i, l) => s && l.indexOf(s) === i);

    submit();
  }
  catch (e) {
    add(e.message);
    add('Use options page to connect to KeePass, KeePassXC, or use a local database');
  }
})();

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

// on embedded
if (window.top !== window) {
  const close = () => chrome.runtime.sendMessage({
    cmd: 'close-me'
  });

  window.addEventListener('keydown', e => e.code === 'Escape' && close());
  window.addEventListener('blur', close);
}
