/* global passkey */

if (typeof importScripts !== 'undefined') {
  self.importScripts('/data/passkey/passkey.create.js');
}

const current = () => chrome.tabs.query({
  lastFocusedWindow: true,
  active: true,
  windowType: 'normal'
}).then(tbs => {
  if (tbs.length === 0) {
    return chrome.tabs.query({
      active: true,
      windowType: 'normal'
    }).then(tbs => tbs[0]);
  }
  return tbs[0];
});

const notify = async (tab, e, badge = 'E', color = '#d93025', timeout) => {
  tab = tab || await current();

  chrome.action.setBadgeText({
    tabId: tab.id,
    text: badge
  });
  chrome.action.setBadgeBackgroundColor({
    tabId: tab.id,
    color
  });
  chrome.action.setTitle({
    tabId: tab.id,
    title: e.message || e
  });

  clearTimeout(notify.id);
  if (timeout > 0) {
    notify.id = setTimeout(() => chrome.action.setBadgeText({
      tabId: tab.id,
      text: ''
    }), timeout);
  }
};

// eslint-disable-next-line no-unused-vars
const storage = { // used by "associate"
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

const copy = async (content, tab) => {
  // Firefox
  try {
    await navigator.clipboard.writeText(content);
    notify(undefined, 'Done', '✓', 'green', 3000);
  }
  catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: password => {
          navigator.clipboard.writeText(password).then(() => chrome.runtime.sendMessage({
            cmd: 'notify',
            message: 'Done',
            badge: '✓',
            color: 'green',
            timeout: 3000
          })).catch(() => chrome.runtime.sendMessage({
            cmd: 'copy-interface',
            password
          }));
        },
        args: [content],
        injectImmediately: true
      });
    }
    catch (e) {
      copy.interface(content);
    }
  }
};
copy.interface = async content => {
  const win = await chrome.windows.getCurrent();
  chrome.windows.create({
    url: '/data/copy/index.html?content=' + encodeURIComponent(content),
    width: 400,
    height: 300,
    left: win.left + Math.round((win.width - 400) / 2),
    top: win.top + Math.round((win.height - 300) / 2),
    type: 'popup'
  });
};

// messaging
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.cmd === 'close-me') {
    chrome.scripting.executeScript({
      target: {
        tabId: sender.tab.id
      },
      func: () => {
        for (const e of document.querySelectorAll('dialog.kphelper')) {
          e.remove();
        }

        window.focus();
        try {
          window.aElement.focus();
        }
        catch (e) {
          document.activeElement.focus();
        }
      },
      injectImmediately: true
    });
  }
  else if (request.cmd === 'passkey-interface') {
    chrome.windows.getCurrent().then(win => {
      const args = new URLSearchParams();
      args.set('data', JSON.stringify(request.data, undefined, '  ').replaceAll('\\\\n', '\\n'));
      args.set('href', sender.tab.url);

      chrome.windows.create({
        url: '/data/passkey/index.html?' + args.toString(),
        width: 700,
        height: 900,
        left: win.left + Math.round((win.width - 400) / 2),
        top: win.top + Math.round((win.height - 300) / 2),
        type: 'popup'
      });
    });
  }
  else if (request.cmd === 'notify') {
    notify(undefined, request.message, request.badge, request.color, request.timeout);
  }
  else if (request.cmd === 'copy-interface') {
    copy.interface(request.password);
  }
  else if (request.cmd === 'native') {
    chrome.runtime.sendNativeMessage(request.id, request.request, response);
    return true;
  }
  else if (request.cmd === 'session-storage-get') {
    chrome.storage.session.get(request.prefs, response);
    return true;
  }
});

// Context Menu
{
  const once = () => {
    if (once.done) {
      return;
    }
    once.done = true;

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
      id: 'auto-login',
      title: 'Perform auto-login for this URL',
      contexts: ['action'],
      enabled: false
    }, () => chrome.runtime.lastError);
    chrome.contextMenus.create({
      id: 'extra',
      title: 'Extra',
      contexts: ['action']
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
}
const onCommand = async (info, tab) => {
  tab = tab || await current();

  if (info.menuItemId === 'generate-passkey' || info.menuItemId === 'generate-passkey:backed-up') {
    passkey.set(tab.id, {
      'backed-up': info.menuItemId === 'generate-passkey:backed-up'
    }).then(() => {
      notify(tab, 'Proceed with passkey generation', '🔏', '#3f51b5');
    }).catch(e => {
      console.warn(e);
      notify(tab, e);
    });
  }
  else if (info.menuItemId === 'save-form') {
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
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }

      // copy to clipboard
      copy([first, ...rest].join(''), tab);
    });
  }
  else if (info.menuItemId === 'auto-login') {
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

const icon = () => chrome.storage.session.get({
  'ssdb-exported-key': ''
}, prefs => {
  const b = Boolean(prefs['ssdb-exported-key']);

  chrome.action.setIcon({
    path: {
      '16': '/data/icons/' + (b ? 'ssdb/' : '') + '16.png',
      '32': '/data/icons/' + (b ? 'ssdb/' : '') + '32.png',
      '48': '/data/icons/' + (b ? 'ssdb/' : '') + '48.png'
    }
  });
});
chrome.runtime.onStartup.addListener(icon);
chrome.runtime.onInstalled.addListener(icon);

/* in KeePassXC mode check */
chrome.storage.onChanged.addListener(ps => {
  if (ps.engine && ps.engine.newValue === 'keepassxc') {
    if (typeof chrome.runtime.sendNativeMessage === 'undefined') {
      chrome.runtime.reload();
    }
  }
  if (ps['ssdb-exported-key']) {
    icon();
  }
});

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
