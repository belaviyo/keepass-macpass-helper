/* global engine, Safe, passkey */
'use strict';

const list = document.getElementById('list');
const search = document.querySelector('input[type=search]');
const psbox = document.getElementById('password-needed');
psbox.onkeydown = e => e.stopPropagation();

// can I use allFames or chrome.scripting fails?
let allFrames = true;

let url;
let tab = {};
let usernames = [];

const timebased = {
  words: {
    otp: ['KPH: otp', 'KPH:otp', 'otp'],
    sotp: ['KPH: sotp', 'KPH:sotp', 'sotp'],
    botp: ['TimeOtp-Secret-Base32']
  },
  includes(o) {
    const {stringFields = []} = o;
    if (o) {
      const b = stringFields.some(o => timebased.words.otp.includes(o.Key)) ||
        stringFields.some(o => timebased.words.sotp.includes(o.Key)) ||
        stringFields.some(o => timebased.words.botp.includes(o.Key));

      if (b) {
        return Promise.resolve(true);
      }
      if (o.uuid) {
        return engine.asyncOTP(o.uuid).then(totp => totp !== '');
      }
    }
    return Promise.resolve(false);
  },
  async get(o) {
    const {stringFields} = o;

    const otp = stringFields.filter(o => timebased.words.otp.includes(o.Key)).shift();
    const sotp = stringFields.filter(o => timebased.words.sotp.includes(o.Key)).shift();

    if (sotp) {
      return await engine.otp(await decrypt(sotp.Value));
    }
    else if (otp) {
      return await engine.otp(otp.Value);
    }

    // built-in OTP of KeePass
    const secret = stringFields.filter(o => timebased.words.botp.includes(o.Key)).shift();
    const period = stringFields.filter(o => ['TimeOtp-Period'].includes(o.Key)).shift();
    const digits = stringFields.filter(o => ['TimeOtp-Length'].includes(o.Key)).shift();

    if (secret) {
      const args = new URLSearchParams();
      args.set('secret', secret.Value);
      args.set('period', period?.Value || 30);
      args.set('digits', digits?.Value || 6);

      return await engine.otp(args.toString());
    }

    if (o.uuid) {
      const v = engine.asyncOTP(o.uuid);
      if (v) {
        return v;
      }
    }

    throw Error(Error('NO_OTP_Provided'));
  }
};

const decrypt = async sotp => {
  psbox.querySelector('span').textContent = 'Enter password to decrypt the secure OTP';
  psbox.classList.remove('hidden');
  psbox.querySelector('input').select();
  psbox.querySelector('input').focus();

  const password = await new Promise(resolve => psbox.onsubmit = e => {
    e.preventDefault();
    resolve(psbox.querySelector('input').value);
  });
  psbox.classList.add('hidden');

  const safe = new Safe();
  await safe.open(password);
  return safe.decrypt(sotp);
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
  remote: (o, type = 'local') => new Promise(resolve => chrome.storage[type].get(o, resolve))
};
const cookie = {
  get host() {
    return (new URL(url)).hostname;
  },
  get: () => {
    const value = storage.get('cookie:' + cookie.host);

    if (value) {
      try {
        const args = new URLSearchParams(value);
        if (args.has('value')) {
          return {
            value: args.get('value'),
            name: args.get('name')
          };
        }
      }
      catch (e) {}

      // fallback
      return {value};
    }
    // fallback for older version
    const key = document.cookie.split(`${cookie.host}=`);
    if (key.length > 1) {
      return {
        value: key[1].split(';')[0]
      };
    }
  },
  set: list => {
    const args = new URLSearchParams();
    args.set('value', list.value);
    if (list.selectedValues[0][1].part === 'name') {
      const {name} = list.selectedValues[0][1];
      args.set('name', name);
    }

    storage.set('cookie:' + cookie.host, args.toString());
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

function add(o, select = false) {
  list.classList.remove('error');

  const {option} = list.add([{
    name: o.Login || '',
    part: 'login',
    title: o.Login || '',
    password: o.Password,
    stringFields: o.StringFields,
    from: o.from,
    uuid: o.uuid, // for KeePassXC's built-in OTP
    href: o.href, // for internal secure storage
    query: o.query // for updating entry later
  }, {
    name: o.Name || '',
    part: 'name'
  }, {
    name: o.group || '',
    part: 'group'
  }], o.Login, o.Login, select);

  if (o.Password) {
    option.title = `Username: ${o.Login}
Name: ${o.Name || ''}
Group: ${o.group || ''}
String Fields: ${(o.StringFields || []).length}`;
  }
  else {
    option.title = o.Login;
  }

  list.focus();
}
function error(e) {
  document.getElementById('title').setAttribute('width', 0);
  document.getElementById('group').setAttribute('width', 0);
  list.classList.add('error');

  console.warn(`id: ` + chrome.runtime.id, e);

  list.add([{
    name: e.message || e || 'Unknown Error',
    part: 'login'
  }], undefined, undefined, true);
  const {option} = list.add([{
    name: 'Use the options page to connect to KeePass, KeePassXC, or a local database',
    part: 'login'
  }]);
  option.disabled = true;
  list.focus();
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

  list.clear();

  [...document.getElementById('toolbar').querySelectorAll('input,button')].forEach(input => {
    input.disabled = true;
  });

  try {
    const q = {
      url: query
    };
    const response = await engine.search(q);

    // hide group and title columns if no data available
    document.getElementById('group').setAttribute('width', response.Entries.some(o => o.group) ? '1fr' : '0');
    document.getElementById('title').setAttribute('width', response.Entries.some(o => o.Name) ? '1fr' : '0');
    if (response.Entries.length === 0) {
      const {option} = list.add([{
        name: 'No credential for this page!',
        part: 'login'
      }], undefined, undefined, true);
      option.disabled = true;
      list.focus();
    }
    else {
      submit.populated = false;

      // select an item
      const selected = {};
      const username = response.Entries.map(e => e.Login).filter(u => usernames.includes(u)).at(0);
      const cache = cookie.get();
      if (username) {
        // username is not the last selected one
        if (cache && cache.value !== username) {
          selected.Login = username;
        }
      }

      if (!selected.Login && cache) {
        for (const o of response.Entries) {
          if ('name' in cache) {
            if (o.Login === cache.value && o.Name === cache.name) {
              selected.Login = cache.value;
              selected.Name = cache.name;
              break;
            }
          }
          else if (o.Login === cache.value) {
            selected.Login = cache.value;
            break;
          }
        }
      }
      const prefs = await storage.remote({
        'auto-login': false,
        'auto-submit': true,
        'sort': {
          'active': true,
          'key': 'Login',
          'direction': 1
        }
      });

      // sort
      if (prefs.sort.active) {
        response.Entries.sort((a, b) => {
          return (prefs.sort.direction === 'az' ? 1 : -1) * (a[prefs.sort.key] || '').localeCompare(b[prefs.sort.key]);
        });
      }
      // add
      for (const o of response.Entries) {
        o.query = q;
        const b = list.value ? false : (
          ('Name' in selected) ? (selected.Login === o.Login && selected.Name === o.Name) : (selected.Login === o.Login)
        );
        add(o, b);
      }
      // what if we have no selection
      if (!list.value) {
        list.value = response.Entries[0].Login;
      }

      submit.populated = true;

      list.dispatchEvent(new Event('change', {
        bubbles: true
      }));

      if (response.Entries.length === 1) {
        if (prefs['auto-login']) {
          document.querySelector('[data-cmd="insert-both"]').dispatchEvent(new CustomEvent('click', {
            'detail': prefs['auto-submit'] ? '' : 'no-submit',
            'bubbles': true
          }));
        }
      }
    }
  }
  catch (e) {
    console.warn(e);
    error(e);
  }
}
submit.populated = true;

document.addEventListener('search', submit);

{
  let lastO;
  list.addEventListener('change', e => {
    if (submit.populated === false) {
      return;
    }

    const target = e.target;

    const disabled =
      target.selectedValues.length === 0 ||
      !target.selectedValues[0] ||
      !target.selectedValues[0][0].password;

    [...document.getElementById('toolbar').querySelectorAll('input, button')]
      .forEach(input => input.disabled = disabled);

    // Only has username
    if (target.selectedValues[0] && target.selectedValues[0][0].name) {
      document.querySelector('#toolbar [data-cmd="insert-login"]').disabled = false;
      document.querySelector('#toolbar [data-cmd="copy"]').disabled = false;
    }

    const o = e.target.selectedValues[0];
    // otp
    document.querySelector('#toolbar [data-cmd="otp"]').disabled = true;
    if (o && o[0]) {
      if (lastO !== o[0]) {
        lastO = o[0];
        timebased.includes(o[0]).then(b => {
          document.querySelector('#toolbar [data-cmd="otp"]').disabled = b === false;
        });
      }
    }
    // passkey
    document.querySelector('#toolbar [data-cmd="passkey"]').disabled = true;
    if (o && o[0] && o[0].stringFields) {
      document.querySelector('#toolbar [data-cmd="passkey"]').disabled = o[0].stringFields.some(o => {
        return o.Key.startsWith('PASSKEY_STORAGE') || o.Key === 'KPEX_PASSKEY_PRIVATE_KEY_PEM';
      }) === false;
    }

    // remove
    document.querySelector('#toolbar [data-cmd="delete"]').disabled = !e.target.selectedValues.length ||
      e.target.selectedValues.some(o => o && ['ssdb', 'kwpass'].includes(o[0]?.from)) === false;
  });
}

const insert = {};
insert.fields = async o => {
  const {stringFields} = o;

  // do we need to use otp or sotp
  if (stringFields.some(o => typeof(o.Value) === 'string' && o.Value.includes('{{TOTP}'))) {
    try {
      const s = await timebased.get(o);
      for (const o of stringFields) {
        o.Value = o.Value.replace('{{TOTP}}', s);
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
      allFrames
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
          let custom = form.querySelector('[id="' + o.Key + '"]') || form.querySelector('[name="' + o.Key + '"]');
          if (!custom) {
            try {
              custom = form.querySelector(o.Key);
            }
            catch (e) {}
          }
          if (custom) {
            custom.focus();
            if (custom.type === 'radio' || custom.type === 'checkbox') {
              custom.checked = o.Value === 'false' || o.Value === '' ? false : true;
            }
            else if ('selectedIndex' in custom) {
              custom.value = o.Value;
            }
            else {
              document.execCommand('selectAll', false, '');
              const v = document.execCommand('insertText', false, o.Value);
              if (!v) {
                try {
                  custom.value = o.Value;
                }
                catch (e) {}
              }
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
    allFrames
  },
  func: username => {
    const once = aElement => {
      // insert username is requested; but password field is selected
      if (aElement.type === 'password') {
        const form = window.detectForm(aElement);
        if (form) {
          const e = [ // first use type=email
            ...form.extendedQuerySelectorAll('input[type=email]'),
            ...form.extendedQuerySelectorAll('input[type=text]')
          ].filter(e => e.offsetParent).sort((a, b) => {
            // try to find the best matched username field
            const keys = ['user', 'usr', 'login'];

            const av = keys.some(s => (a.name || '').includes(s) || (a.id || '').includes(s));
            const bv = keys.some(s => (b.name || '').includes(s) || (b.id || '').includes(s));

            if (av && bv === false) {
              return -1;
            }
            if (av === false && bv) {
              return 1;
            }
          }).shift();

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
    allFrames
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
        for (const e of form.extendedQuerySelectorAll('[type=password]')) {
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
    allFrames
  },
  func: () => {
    const {aElement} = window;
    if (!aElement) {
      return false;
    }

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

const copy = content => navigator.clipboard.writeText(content).then(() => {
  chrome.runtime.sendMessage({
    cmd: 'notify',
    message: 'Done',
    badge: '✓',
    color: 'green',
    timeout: 3000
  }, () => window.close());
}).catch(e => alert(e.message));

document.addEventListener('click', async e => {
  try {
    const target = e.target;
    const cmd = target.dataset.cmd || '';
    const alt = e.metaKey || e.ctrlKey;

    // cache
    if (cmd && (cmd.startsWith('insert-') || cmd.startsWith('copy') || cmd === 'passkey')) {
      cookie.set(list);
    }
    //
    if (cmd && cmd.startsWith('insert-')) {
      const checked = list.selectedValues[0][0];

      let inserted = false;
      // insert StringFields
      if (checked.stringFields && checked.stringFields.length) {
        const r = await insert.fields(checked);
        inserted = inserted || r.reduce((p, c) => p || c.result, false);
      }
      // insert username
      if (cmd === 'insert-login' || cmd === 'insert-both') {
        const r = await insert.username(list.value);
        inserted = inserted || r.reduce((p, c) => p || c.result, false);
      }
      // insert password
      if (cmd === 'insert-password' || cmd === 'insert-both') {
        const r = await insert.password(checked.password);
        inserted = inserted || r.reduce((p, c) => p || c.result, false);
      }

      // do we have a CORS frame
      // does not work in Firefox since the user-action is not detected!
      if (inserted !== true) {
        const origins = [];
        if (e.isTrusted && /Firefox/.test(navigator.userAgent) === false) {
          const r = await chrome.scripting.executeScript({
            target: {
              tabId: tab.id
            },
            func: () => document.extendedQuerySelectorAll('iframe[src]')
              .map(e => e.src)
              .filter(s => s && s.startsWith('http') && s.startsWith(location.origin) === false)
          });

          origins.push(...r[0].result);
        }

        if (origins.length) {
          chrome.permissions.request({
            origins
          }).then(granted => {
            if (granted) {
              e.target.dispatchEvent(new Event('click', {
                bubbles: true
              }));
            }
          });
        }
        else {
          chrome.runtime.sendMessage({
            cmd: 'notify',
            message: `Cannot find any login forms on this page!

  For cross-origin login forms, use the options page to permit access`
          });
        }
      }
      // submit
      if (cmd === 'insert-both' && alt === false && inserted) {
        await insert.submit();
      }
      window.close();
    }
    else if (cmd && cmd.startsWith('copy')) {
      if (e.detail === 'password' || alt) {
        copy(list.selectedValues.map(a => a[0].password).join('\n'));
      }
      else {
        copy(list.selectedValues.map(a => a[0].name).join('\n'));
      }
    }
    else if (cmd === 'otp') {
      const checked = list.selectedValues[0][0];

      try {
        const s = await timebased.get(checked);

        if (s) {
          await copy(s);
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
    else if (cmd === 'passkey') {
      try {
        const checked = list.selectedValues[0][0];
        const data = checked.stringFields.filter(o => o.Key.startsWith('PASSKEY_STORAGE'));
        // Append KeePassXC style passkey;
        if (checked.stringFields.some(o => o.Key === 'KPEX_PASSKEY_PRIVATE_KEY_PEM')) {
          try {
            const id = checked.stringFields.filter(o => o.Key === 'KPEX_PASSKEY_CREDENTIAL_ID').shift().Value;
            // duplication check
            if (data.some(o => o.CREDENTIAL_ID === id) === false) {
              data.push({
                Key: 'KeePassXC',
                Value: JSON.stringify({
                  PRIVATE_KEY_PEM: checked.stringFields
                    .filter(o => o.Key === 'KPEX_PASSKEY_PRIVATE_KEY_PEM').shift().Value,
                  CREDENTIAL_ID: id,
                  RELYING_PARTY: checked.stringFields.filter(o => o.Key === 'KPEX_PASSKEY_RELYING_PARTY').shift().Value,
                  USER_HANDLE: checked.stringFields.filter(o => o.Key === 'KPEX_PASSKEY_USER_HANDLE').shift().Value,
                  USERNAME: checked.stringFields.filter(o => o.Key === 'KPEX_PASSKEY_USERNAME').shift().Value
                }).replaceAll('\\\\n', '\\n')
              });
            }
          }
          catch (e) {
            console.error(e);
          }
        }

        let selectedData = data[0];
        if (data.length > 1) {
          const r = prompt('Which passkey would you like to use?\n\n' + data.map((o, n) => {
            return (n + 1) + ': ' + o.Key;
          }).join('\n'), 1);

          if (!r) {
            return;
          }
          if (isNaN(r)) {
            return;
          }
          selectedData = data[Number(r) - 1];
          if (!selectedData) {
            return;
          }
        }

        const json = JSON.parse(selectedData.Value);
        await passkey.get(json);
        await chrome.runtime.sendMessage({
          cmd: 'notify',
          message: 'Proceed passkey login on the page',
          badge: '🔐',
          color: 'green'
        });
        window.close();
      }
      catch (e) {
        console.warn(e);
        alert(e.message);
      }
    }
    else if (cmd === 'options-page') {
      chrome.runtime.openOptionsPage();
    }
    else if (cmd === 'delete') {
      const entries = list.selectedValues;
      if (confirm(`Are you sure you want to remove ${entries.length} item(s) from secure or internal storage?`)) {
        // kwpass
        {
          const uuids = entries.filter(e => e[0].from === 'kwpass').map(e => e[0].uuid);

          if (uuids.length) {
            await engine.core.remove(uuids);
          }
        }
        // ssdb (in future we can use entry.uuid for deletion)
        {
          for (const entry of entries) {
            const o = entry[0];
            if (o.from === 'ssdb') {
              const uuids = await engine.ssdb.convert(o.href);
              for (const uuid of uuids) {
                await engine.ssdb.remove(uuid, e => {
                  return entries.filter(a => a[0].name === e.Login && a[0].password === e.Password).length === 0;
                });
              }
            }
          }
        }
        location.reload();
      }
    }

    if (psbox.classList.contains('hidden') === true && e.target.type !== 'search') {
      list.focus();
    }
  }
  catch (e) {
    console.warn(e);
    alert(e.message);
  }
});

// keep focus
window.addEventListener('blur', () => window.setTimeout(window.focus, 0));

// check HTTP access
const access = () => new Promise(resolve => chrome.storage.local.get({
  host: 'http://localhost:19455'
}, prefs => {
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
          resolve();
        }
      }));
    }
    else {
      resolve();
    }
  });
}));

// init
(async () => {
  // prepare the engine engine
  const prefs = await storage.remote({
    engine: 'keepass'
  });

  try {
    if (prefs.engine === 'keepass') {
      await access();
    }
    await engine.prepare(prefs.engine);
    await engine.connected(prefs.engine);

    if (prefs.engine === 'kwpass') {
      psbox.querySelector('span').textContent = 'Unlock Internal Database';
      psbox.classList.remove('hidden');
      psbox.querySelector('input').select();
      psbox.querySelector('input').focus();

      const password = (await storage.remote({
        'kw:password': ''
      }, 'session'))['kw:password'] || await new Promise(resolve => psbox.onsubmit = e => {
        e.preventDefault();
        resolve(psbox.querySelector('input').value);
      });
      psbox.classList.add('hidden');

      try {
        await engine.core.open(password);
      }
      catch (e) { // delete wrong password
        await chrome.storage.session.remove('kw:password');
        throw Error(e);
      }

      chrome.storage.session.set({
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

    let aElement = false;
    try {
      // sometimes "chrome.scripting.executeScript" does not resolve when there are cross-origin frames
      let r = await Promise.race([
        chrome.scripting.executeScript({
          target: {
            tabId: tab.id,
            allFrames: true
          },
          files: ['/data/helper.js', '/data/cmd/inject.js']
        }),
        new Promise(resolve => setTimeout(() => resolve(false), 2000))
      ]);
      if (r === false) {
        allFrames = false;
        r = await chrome.scripting.executeScript({
          target: {
            tabId: tab.id,
            allFrames: false
          },
          files: ['/data/helper.js', '/data/cmd/inject.js']
        });
      }

      usernames = r.filter(a => a).map(r => r.result?.usernames).flat().filter((s, i, l) => s && l.indexOf(s) === i);
      aElement = r.filter(a => a).map(r => r.result?.aElement).flat().some(a => a);
    }
    catch (e) {
      console.warn(e);
      if (!tab.url || tab.url.startsWith('http') === false) {
        throw Error(e);
      }
    }

    // in case there is no active element show the toast
    if (aElement === false) {
      chrome.permissions.contains({
        origins: ['<all_urls>']
      }).then(granted => {
        if (granted) {
          document.querySelector('#toast input').style.visibility = 'hidden';
        }
        document.querySelector('#toast span').textContent = 'No active form found!' + (granted ? ' Focus an element on the page and retry.' : '');
        document.getElementById('toast').classList.remove('hidden');
      });
    }
    submit();
  }
  catch (e) {
    error(e);
  }
  window.focus();
})();

// dbl-click
list.addEventListener('dblclick', () => {
  document.querySelector('[data-cmd="insert-both"]').click();
});

// on embedded
if (window.top !== window) {
  const close = () => chrome.runtime.sendMessage({
    cmd: 'close-me'
  });

  window.addEventListener('keydown', e => e.code === 'Escape' && close());
  window.addEventListener('blur', close);

  window.close = new Proxy(window.close, {
    apply(target, self, args) {
      close();

      return Reflect.apply(target, self, args);
    }
  });


  // make sure the needed APIs are available on embedded mode
  try {
    chrome.scripting.executeScript;
    chrome.tabs.query;
  }
  catch (e) {
    alert('Something went wrong! Instead of the embedded mode, open the interface from the toolbar button. Error:\n\n' + e.message);
  }
}

// permission
document.querySelector('#toast input').onclick = () => chrome.permissions.request({
  origins: ['<all_urls>']
}, granted => {
  if (granted) {
    window.close();
  }
});
