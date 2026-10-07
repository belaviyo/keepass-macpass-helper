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

const kwpass = new KWPASS();
const read = file => new Promise(resolve => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(new Uint8Array(reader.result));
  reader.readAsArrayBuffer(file);
});
// refresh the file lists, the empty-storage warning and the write-back checkbox state
const renderFiles = async () => {
  if (!kwpass.file) {
    return;
  }
  try {
    const meta = await kwpass.resolveMeta();
    const entries = await kwpass.file.list();
    const databases = [];
    const keys = [];
    for (const entry of entries) {
      const o = meta.files[String(entry.key)] || {};
      const name = o.name || entry.handle?.name || 'File';
      (o.type === 'database' ? databases : keys).push({...entry, name, o});
    }

    const dbBox = document.getElementById('kwpass-databases');
    const keyBox = document.getElementById('kwpass-keys');
    dbBox.replaceChildren();
    keyBox.replaceChildren();
    // fresh render clears selections; "Delete File(s)" stays disabled until a row is checked
    document.getElementById('kwpass-remove').disabled = true;

    for (const entry of databases) {
      const row = document.createElement('div');
      row.className = 'file-entry';

      const pick = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'kwpass-active';
      radio.dataset.key = String(entry.key);
      radio.checked = meta.active === String(entry.key);
      const span = document.createElement('span');
      span.textContent = entry.name + ' (' + Math.round(entry.bytes.length / 1024) + ' KB)';
      pick.append(radio, span);

      const keyLabel = document.createElement('label');
      keyLabel.className = 'key-select';
      keyLabel.textContent = 'key:';
      const select = document.createElement('select');
      select.dataset.key = String(entry.key);
      select.append(new Option('(none)', ''));
      for (const k of keys) {
        select.append(new Option(k.name, String(k.key)));
      }
      select.value = entry.o.key || '';
      keyLabel.append(select);

      const remove = document.createElement('input');
      remove.type = 'checkbox';
      remove.className = 'remove';
      remove.dataset.key = String(entry.key);

      row.append(pick, keyLabel, remove);
      dbBox.append(row);
    }

    for (const entry of keys) {
      const row = document.createElement('div');
      row.className = 'file-entry';

      const span = document.createElement('span');
      span.textContent = entry.name + ' (' + Math.round(entry.bytes.length / 1024) + ' KB)';

      const usedBy = databases.filter(d => d.o.key === String(entry.key)).map(d => d.name);
      const use = document.createElement('span');
      use.className = 'used-by';
      use.textContent = usedBy.length ? 'used by: ' + usedBy.join(', ') : 'not in use';

      const remove = document.createElement('input');
      remove.type = 'checkbox';
      remove.className = 'remove';
      remove.dataset.key = String(entry.key);

      row.append(span, use, remove);
      keyBox.append(row);
    }

    if (databases.length && keys.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'No key files are stored.';
      keyBox.append(p);
    }

    document.getElementById('kwpass-warn').classList.toggle('show', databases.length === 0);
    // "Select Key File" needs an existing database
    document.getElementById('kwpass-key').disabled = databases.length < 1;
    const hasHandle = entries.some(e => e.handle);
    document.getElementById('kwpass-overwrite-container').classList.toggle('disabled', !hasHandle);
    if (!hasHandle) {
      document.getElementById('kwpass-overwrite').checked = false;
    }
  }
  catch (e) {
    console.error(e);
  }
  // let the background know about the internal database state
  chrome.runtime.sendMessage({
    cmd: 'kwpass-update'
  }).catch(() => {});
};

kwpass.prepare().then(renderFiles).catch(console.error);
// the context menu can switch the active database while this page is open
chrome.storage.onChanged.addListener((ps, area) => {
  if (area === 'local' && ps['kwpass-meta']) {
    renderFiles();
  }
});
// make sure we have write permission
document.getElementById('kwpass-overwrite').onchange = async e => {
  if (e.target.checked) {
    await kwpass.prepare();
    const meta = await kwpass.resolveMeta();
    const handle = meta.active ? await kwpass.file.handle(Number(meta.active)) : null;

    if (!handle) {
      toast('No external file is attached to the active database. Saving changes to the internal database only.', undefined, 10000);
      e.target.checked = false;
      return;
    }
    const permission = await handle.queryPermission({mode: 'readwrite'});
    if (permission === 'denied') {
      toast('No permission to write to local dataset. Saving changes to internal database only.', undefined, 10000);
      e.target.checked = false;
    }
    else if (permission === 'prompt') {
      const result = await handle.requestPermission({mode: 'readwrite'});
      if (result !== 'granted') {
        toast('No permission to write to local dataset. Saving changes to internal database only.', undefined, 10000);
        e.target.checked = false;
      }
    }
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

// inline result message of the Check Integration buttons (per-pane timer)
const note = (id, msg, timeout = 5000, bad = false) => {
  const span = document.getElementById(id);
  span.textContent = msg;
  span.classList.toggle('bad', bad);
  note.ids = note.ids || {};
  clearTimeout(note.ids[id]);
  note.ids[id] = setTimeout(() => {
    span.textContent = '';
  }, timeout);
};

const showPanel = engine => {
  for (const panel of [...document.querySelectorAll('.panel')]) {
    panel.classList.toggle('show', panel.dataset.engine === engine);
  }
  for (const tab of [...document.querySelectorAll('.tab')]) {
    tab.classList.toggle('active', tab.dataset.tab === engine);
  }
};

const renderChoice = () => {
  const engine = document.querySelector('[name="method"]:checked')?.id;
  for (const tab of [...document.querySelectorAll('.tab')]) {
    tab.classList.toggle('selected', tab.dataset.tab === engine);
  }
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
        renderChoice();
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
    'keys': KEYS,
    'kwpass-overwrite': false
  }, prefs => {
    document.getElementById(prefs.engine).checked = true;
    // make sure we have access to the native client
    if (prefs.engine === 'keepassxc') {
      if (!chrome.runtime.sendNativeMessage) {
        document.getElementById('keepass').checked = true;
      }
    }
    // open the pane of the selected connection type
    showPanel(document.querySelector('[name="method"]:checked')?.id);
    renderChoice();
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
    document.getElementById('kwpass-overwrite').checked = prefs['kwpass-overwrite'];

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

  // make sure a database is attached when "Local File" mode is selected
  if (document.getElementById('kwpass').checked && kwpass.file) {
    const meta = await kwpass.resolveMeta();
    if (!meta.active) {
      toast('Warning: "Local File" mode is selected but no database is created or selected yet', undefined, 10000);
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
    },
    'kwpass-overwrite': document.getElementById('kwpass-overwrite').checked
  }, () => {
    toast('Options saved');
  });
}

document.addEventListener('DOMContentLoaded', restore);
document.getElementById('save').addEventListener('click', save);

// connection tabs: browsing the panes (independent from the connection type)
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => showPanel(tab.dataset.tab));
}
// connection type radios: update the selected marker only
for (const radio of document.querySelectorAll('[name="method"]')) {
  radio.addEventListener('change', renderChoice);
}

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
        fetch(url).then(
          () => note('keepass-result', 'Looks Good')
        ).catch(e => note('keepass-result', e.message, 10000, true));
      }
      else {
        note('keepass-result', 'Permission is not granted', 5000, true);
      }
    });
  }
  catch (e) {
    note('keepass-result', e.message, 10000, true);
  }
});

// KeePassXC integration check: native client handshake + association status
document.getElementById('keepassxc-check').addEventListener('click', async () => {
  const xc = new KeePassXC();
  try {
    await xc.prepare();
    await xc['test-associate']();
    note('keepassxc-result', 'Integration looks good');
  }
  catch (e) {
    console.error(e);
    const msg = e.message.startsWith('cannot associate') ?
      'Connected to KeePassXC, but not associated yet' : e.message;
    note('keepassxc-result', msg, 10000, true);
  }
});

const access = document.getElementById('all-frames-access');
const revoke = document.getElementById('all-frames-remove');
const toggle = granted => {
  access.disabled = granted;
  revoke.disabled = !granted;
};
access.addEventListener('click', () => {
  chrome.permissions.request({
    origins: ['<all_urls>']
  }).then(granted => granted && toggle(true));
});
revoke.addEventListener('click', () => {
  chrome.permissions.remove({
    origins: ['<all_urls>']
  }).then(() => toggle(false));
});
// reflect the current state
chrome.permissions.contains({
  origins: ['<all_urls>']
}, toggle);
chrome.permissions.contains({
  permissions: ['webNavigation'],
  origins: ['<all_urls>']
}, granted => granted && document.getElementById('permission').classList.add('hidden'));

// add one or more database files to the internal storage
document.getElementById('kwpass-db').addEventListener('click', async () => {
  try {
    const before = (await kwpass.resolveMeta()).active;
    const handles = await window.showOpenFilePicker({
      multiple: true
    });
    for (const handle of handles) {
      const bytes = await read(await handle.getFile());
      const {db} = await kwpass.attach(bytes, null, handle, null);
      await kwpass.patchMeta(meta => {
        meta.files[String(db)] = {
          type: 'database',
          name: handle.name,
          key: null
        };
      });
    }
    renderFiles();
    toast(handles.length === 1 ? 'Database is stored' : handles.length + ' databases are stored');
    // the cached password belongs to the previous database
    if ((await kwpass.resolveMeta()).active !== before) {
      chrome.storage.session.remove('kw:password');
    }
  }
  catch (e) {
    console.error(e);
    if (e.name !== 'AbortError') {
      toast(e.message);
    }
  }
});

// add one or more key files to the internal storage
document.getElementById('kwpass-key').addEventListener('click', async () => {
  try {
    const meta = await kwpass.resolveMeta();
    if (Object.values(meta.files).some(o => o.type === 'database') === false) {
      return toast('Select a database first');
    }
    const handles = await window.showOpenFilePicker({
      multiple: true
    });
    for (const handle of handles) {
      const bytes = await read(await handle.getFile());
      const key = await kwpass.file.write(bytes, handle);
      await kwpass.patchMeta(m => {
        m.files[String(key)] = {
          type: 'key',
          name: handle.name
        };
      });
    }
    renderFiles();
    toast(handles.length === 1 ? 'Key file is stored' : handles.length + ' key files are stored');
  }
  catch (e) {
    console.error(e);
    if (e.name !== 'AbortError') {
      toast(e.message);
    }
  }
});

// active database switch, key assignment and delete selection
document.querySelector('.panel[data-engine="kwpass"]').addEventListener('change', async e => {
  const target = e.target;
  // enable/disable the delete button based on checked rows
  if (target.classList.contains('remove')) {
    const checked = document.querySelectorAll('#kwpass-databases .remove:checked, #kwpass-keys .remove:checked').length;
    document.getElementById('kwpass-remove').disabled = checked === 0;
  }
  // switch the active database
  else if (target.name === 'kwpass-active') {
    await kwpass.patchMeta(meta => {
      meta.active = target.dataset.key;
    });
    // the cached password belongs to the previous database
    chrome.storage.session.remove('kw:password');
  }
  // assign a key file to a database
  else if (target.tagName === 'SELECT') {
    await kwpass.patchMeta(meta => {
      meta.files[target.dataset.key].key = target.value || null;
    });
    // the cached password belongs to the previous key assignment
    chrome.storage.session.remove('kw:password');
  }
});

// delete the checked files from the internal storage
document.getElementById('kwpass-remove').addEventListener('click', async () => {
  const checks = [...document.querySelectorAll('#kwpass-databases .remove:checked, #kwpass-keys .remove:checked')];
  if (checks.length === 0) {
    return toast('No file is selected');
  }
  try {
    if (confirm('Delete the selected file(s)?')) {
      await kwpass.file.remove(checks.map(c => Number(c.dataset.key)));
      // drop deleted files from the meta and re-point the active database
      await kwpass.patchMeta(() => {});
      const remaining = await kwpass.file.read();
      if (remaining.length === 0) {
        chrome.runtime.sendMessage({cmd: 'kwpass-remove'});
      }
      renderFiles();
      toast('File(s) are removed');
    }
  }
  catch (e) {
    console.error(e);
    toast('Error: ' + e.message);
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
    // always re-open so the active database is exported (not a previously opened one)
    kwpass.prepare().then(() => kwpass.open(password)).then(() => kwpass.export()).catch(e => {
      toast('[Error] ' + e.message);
      console.warn(e);
    });
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
      const before = (await kwpass.resolveMeta()).active;
      await kwpass.prepare();
      await kwpass.create(password);
      renderFiles();
      toast('Database is ready');
      // the cached password belongs to the previous database
      if ((await kwpass.resolveMeta()).active !== before) {
        chrome.storage.session.remove('kw:password');
      }
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
