/* globals passkey */

// Context Menu
const MODES = {
  'keepass': 'KeePassHTTP',
  'keepassxc': 'KeePassXC',
  'kwpass': 'Local File',
  'none': 'Secure Synced Storage only'
};

// list the stored internal databases ([{key, name, active}]); mirrors the meta
// resolution of connect.js (KWPASS.resolveMeta) including its legacy positional
// fallback (first stored file = the database, second = its key file)
const kwpassDBs = async () => {
  const entries = await new Promise(resolve => {
    const request = indexedDB.open('database', 2);

    request.onerror = () => resolve([]);
    request.onupgradeneeded = () => {
      // mimic KWFILE.open to keep the shape consistent; an empty db means no databases
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', {
          autoIncrement: true
        });
      }
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['files', 'handles'], 'readonly');
      const keys = [];
      const names = {};
      transaction.objectStore('files').openKeyCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          keys.push(cursor.key);
          cursor.continue();
        }
      };
      transaction.objectStore('handles').openCursor().onsuccess = e => {
        const cursor = e.target.result;
        if (cursor) {
          names[String(cursor.key)] = cursor.value?.name;
          cursor.continue();
        }
      };
      transaction.oncomplete = () => {
        db.close();
        resolve(keys.map(key => ({
          key,
          name: names[String(key)]
        })));
      };
      transaction.onerror = () => {
        db.close();
        resolve([]);
      };
    };
  });

  if (entries.length === 0) {
    return [];
  }
  const prefs = await chrome.storage.local.get({
    'kwpass-meta': null
  });
  const stored = prefs['kwpass-meta'];

  const files = {};
  entries.forEach((entry, index) => {
    const key = String(entry.key);
    const o = stored?.files?.[key];
    files[key] = {
      type: o?.type === 'database' || o?.type === 'key' ? o.type : (index === 0 ? 'database' : 'key'),
      name: o?.name || entry.name || (index === 0 ? 'Database' : 'Key file')
    };
  });

  const firstDb = Object.keys(files).find(key => files[key].type === 'database');
  const active = stored?.active && files[stored.active]?.type === 'database' ?
    stored.active : (firstDb || null);

  return Object.entries(files)
    .filter(([, o]) => o.type === 'database')
    .map(([key, o]) => ({key, name: o.name, active: key === active}));
};

// kwpass is only usable when the internal storage has at least one database
const kwpassReady = async () => (await kwpassDBs()).length > 0;

// native messaging support is required by the KeePassXC engine
const keepassxcReady = () => typeof chrome.runtime.sendNativeMessage !== 'undefined';

const modeReady = {
  keepass: () => true, // always usable
  keepassxc: keepassxcReady,
  kwpass: kwpassReady,
  none: () => true // always usable
};

// the radio list of the stored databases; only meaningful for the Local File mode
const dbItems = new Set();
const doUpdateDatabases = async () => {
  const prefs = await chrome.storage.local.get({
    engine: 'keepass'
  });
  const dbs = await kwpassDBs();

  // hide the submenu entirely unless the Local File mode is active with a database attached
  chrome.contextMenus.update('kwpass-dbs', {
    visible: prefs.engine === 'kwpass' && dbs.length > 0
  }, () => chrome.runtime.lastError);

  const seen = new Set();
  for (const db of dbs) {
    const id = 'kwpass-db:' + db.key;
    seen.add(id);
    const props = {
      type: 'radio',
      title: db.name,
      checked: db.active
    };
    if (dbItems.has(id)) {
      chrome.contextMenus.update(id, props, () => chrome.runtime.lastError);
    }
    else {
      dbItems.add(id);
      chrome.contextMenus.create({
        ...props,
        id,
        parentId: 'kwpass-dbs',
        contexts: ['action']
      }, () => {
        // forget failed creations (e.g. parent menu not ready yet) so the next refresh retries
        if (chrome.runtime.lastError) {
          dbItems.delete(id);
        }
      });
    }
  }
  // drop menu items of deleted databases
  for (const id of dbItems) {
    if (!seen.has(id)) {
      dbItems.delete(id);
      chrome.contextMenus.remove(id, () => chrome.runtime.lastError);
    }
  }
};
// serialize the updates; concurrent refreshes would create the same item twice
let dbUpdate = Promise.resolve();
const updateDatabases = () => {
  dbUpdate = dbUpdate.then(doUpdateDatabases).catch(e => console.warn(e));
  return dbUpdate;
};

const updateModes = async () => {
  const prefs = await chrome.storage.local.get({
    engine: 'keepass'
  });

  for (const id of Object.keys(MODES)) {
    chrome.contextMenus.update(id, {
      checked: prefs.engine === id,
      enabled: await modeReady[id]()
    }, () => chrome.runtime.lastError);
  }
  // keep the database radio list in sync as well
  await updateDatabases();
};

{
  const once = () => {
    if (once.done) {
      return;
    }
    once.done = true;

    chrome.contextMenus.create({
      id: 'modes',
      title: 'Modes',
      contexts: ['action']
    }, () => {
      chrome.runtime.lastError;
      updateModes();
    });

    for (const [id, title] of Object.entries(MODES)) {
      chrome.contextMenus.create({
        id,
        title,
        contexts: ['action'],
        'type': 'radio',
        parentId: 'modes',
        // actual state is applied by updateModes once config is checked
        checked: false,
        enabled: id === 'keepassxc' ? keepassxcReady() : true
      }, () => chrome.runtime.lastError);
    }

    // radio list of the internal databases (active one is checked)
    chrome.contextMenus.create({
      id: 'kwpass-dbs',
      title: 'Local File Database',
      contexts: ['action'],
      visible: false
    }, () => {
      chrome.runtime.lastError;
      updateDatabases();
    });

    chrome.contextMenus.create({
      id: 'generate-password',
      title: 'Generate a Random Password',
      contexts: ['action']
    }, () => chrome.runtime.lastError);

    chrome.contextMenus.create({
      id: 'save-form',
      title: 'Save a new Login Form in KeePass',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'passkey',
      title: 'Passkey Generation (Beta)',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'generate-passkey',
      title: 'Intercept',
      contexts: ['action'],
      parentId: 'passkey'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'generate-passkey:backed-up',
      title: 'Intercept + Backup Verify',
      contexts: ['action'],
      parentId: 'passkey'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'extra',
      title: 'Extra',
      contexts: ['action']
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'auto-login',
      title: 'Perform auto-login for this URL',
      contexts: ['action'],
      enabled: false,
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'encrypt-data',
      title: 'Encrypt or Decrypt a String',
      contexts: ['action'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'open-keyboards',
      title: 'Keyboard Shortcut Settings',
      contexts: ['action'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'lock-secure-synced-storage',
      title: 'Lock Secure Synced Storage',
      contexts: ['action'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'lock-kwpass',
      title: 'Lock Internal Database',
      contexts: ['action'],
      parentId: 'extra'
    }, () => chrome.runtime.lastError);
    if (/Firefox/.test(navigator.userAgent)) {
      chrome.contextMenus.create({
        id: 'open-options',
        title: 'Open Options Page',
        contexts: ['action']
      }, () => chrome.runtime.lastError);
    }
  };
  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);

  // keep mode items in sync with the stored engine and configuration state
  chrome.storage.onChanged.addListener((ps, area) => {
    if (area === 'local') {
      updateModes();
    }
  });
  // attach/delete actions on the internal database do not always write to storage
  chrome.runtime.onMessage.addListener(request => {
    if (request.cmd === 'kwpass-update' || request.cmd === 'kwpass-remove') {
      updateModes();
    }
  });
}

const onCommand = async (info, tab) => {
  if (info.menuItemId in MODES) {
    chrome.storage.local.set({
      engine: info.menuItemId
    });
  }
  else if (String(info.menuItemId).startsWith('kwpass-db:')) {
    // switch the active internal database
    const key = String(info.menuItemId).split(':')[1] || '';
    const prefs = await chrome.storage.local.get({
      'kwpass-meta': null
    });
    const meta = prefs['kwpass-meta'] || {
      active: null,
      files: {}
    };
    meta.active = key;
    await chrome.storage.local.set({
      'kwpass-meta': meta
    });
    // the cached password belongs to the previous database
    chrome.storage.session.remove('kw:password');
  }
  else if (info.menuItemId === 'generate-passkey' || info.menuItemId === 'generate-passkey:backed-up') {
    tab = tab || await current();

    passkey.set(tab.id, {
      'backed-up': info.menuItemId === 'generate-passkey:backed-up'
    }).catch(e => {
      console.warn(e);
      notify(tab, e);
    });
  }
  else if (info.menuItemId === 'save-form') {
    tab = tab || await current();

    const target = {
      tabId: tab.id
    };

    try {
      await chrome.scripting.executeScript({
        target: {
          ...target,
          allFrames: true
        },
        files: ['/data/helper.js'],
        injectImmediately: true
      });

      // collect logins
      const r = await chrome.scripting.executeScript({
        target: {
          ...target,
          allFrames: true
        },
        func: () => {
          const inputs = document.extendedQuerySelectorAll('input[type=password]');
          const forms = inputs
            .map(p => self.detectForm(p, 'input[type=text],input[type=email]'))
            .filter((f, i, l) => f && l.indexOf(f) === i);

          return forms.map(f => {
            const usernames = [
              ...f.extendedQuerySelectorAll('input[type=text]'),
              ...f.extendedQuerySelectorAll('input[type=email]')
            ].flat().map(e => e.value).filter(s => s);
            const passwords = inputs.map(e => e.value).filter(s => s);

            return {
              usernames,
              passwords
            };
          });
        },
        injectImmediately: true
      });

      const pairs = r.map(o => o.result).flat().filter(a => a);

      await chrome.scripting.executeScript({
        target,
        func: pairs => {
          window.pairs = pairs;
        },
        args: [pairs],
        injectImmediately: true
      });

      await chrome.scripting.insertCSS({
        target,
        files: ['/data/save/inject.css']
      });
      await chrome.scripting.executeScript({
        target,
        files: ['/data/save/inject.js'],
        injectImmediately: true
      });
    }
    catch (e) {
      console.warn(e);
      notify(tab, e);
    }
  }
  else if (info.menuItemId === 'open-options') {
    chrome.runtime.openOptionsPage();
  }
  else if (info.menuItemId === 'open-keyboards') {
    chrome.tabs.create({
      url: 'chrome://extensions/configureCommands'
    });
  }
  else if (info.menuItemId === 'encrypt-data') {
    tab = tab || await current();

    try {
      const target = {
        tabId: tab.id
      };
      await chrome.scripting.insertCSS({
        target,
        files: ['/data/safe/inject.css']
      });
      await chrome.scripting.executeScript({
        target,
        files: ['/data/safe/inject.js'],
        injectImmediately: true
      });
    }
    catch (e) {
      notify(tab, e);
    }
  }
  else if (info.menuItemId === 'generate-password') {
    tab = tab || await current();

    chrome.storage.local.get({
      'charset-1': 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
      'charset-2': '!@#$%^&*()-_+=',
      'length-1': 10,
      'length-2': 2
    }, prefs => {
      const password = [];

      {
        const array = new Uint8Array(prefs['length-1']);
        crypto.getRandomValues(array);

        for (const byte of array) {
          const n = byte % prefs['charset-1'].length;
          password.push(prefs['charset-1'][n] || '-');
        }
      }
      if (prefs['length-2']) {
        const array = new Uint8Array(prefs['length-2']);
        crypto.getRandomValues(array);

        for (const byte of array) {
          const n = byte % prefs['charset-2'].length;
          password.push(prefs['charset-2'][n] || '-');
        }
      }
      // Shuffle the middle items using Fisher-Yates algorithm
      const [first, ...rest] = password;
      for (let i = rest.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }

      // copy to clipboard
      copy([first, ...rest].join(''), tab);
    });
  }
  else if (info.menuItemId === 'auto-login') {
    tab = tab || await current();

    const {origin} = new URL(tab.url);
    chrome.permissions.request({
      origins: [origin + '/']
    }, granted => {
      if (granted) {
        chrome.storage.local.get({
          'json': []
        }, async prefs => {
          const o = prefs.json.filter(o => o.url.startsWith(origin)).shift();
          try {
            const r = await chrome.scripting.executeScript({
              target: {
                tabId: tab.id
              },
              func: (value = '') => {
                return prompt(`What is the username to match with KeePass database?

This username must exactly correspond to one of the credentials stored in your KeePass database for this URL.`, value);
              },
              args: [o?.username || ''],
              injectImmediately: true
            });
            if (r[0].result) {
              if (o) {
                o.username = r[0].result;
              }
              else {
                prefs.json.push({
                  url: origin,
                  username: r[0].result
                });
              }
            }
            else {
              if (o) {
                const n = prefs.json.indexOf(o);
                prefs.json.splice(n, 1);
              }
            }
            chrome.storage.local.set(prefs);
          }
          catch (e) {
            console.warn(e);
            notify(tab, e);
          }
        });
      }
    });
  }
  else if (info.menuItemId === 'open-embedded') {
    tab = tab || await current();

    const target = {
      tabId: tab.id
    };
    try {
      await chrome.scripting.insertCSS({
        target,
        files: ['/data/embedded/inject.css']
      });
      await chrome.scripting.executeScript({
        target,
        files: ['/data/embedded/inject.js'],
        injectImmediately: true
      });
    }
    catch (e) {
      console.warn(e);
      notify(tab, e);
    }
  }
  else if (info.menuItemId === 'lock-secure-synced-storage') {
    chrome.storage.session.remove('ssdb-exported-key');
  }
  else if (info.menuItemId === 'lock-kwpass') {
    chrome.storage.session.remove('kw:password');
  }
};
chrome.contextMenus.onClicked.addListener(onCommand);
chrome.commands.onCommand.addListener(command => onCommand({
  menuItemId: command
}));
