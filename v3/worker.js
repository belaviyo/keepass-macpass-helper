/* global importScripts */
importScripts('./v2.js');

const notify = (tab, e) => {
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: 'Error'
  });
  chrome.action.setTitle({
    tabId: tab.id,
    title: e.message || e
  });
};
// badge
{
  const once = () => chrome.action.setBadgeBackgroundColor({
    color: '#d93025'
  });

  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}

const copy = content => chrome.windows.getCurrent().then(win => {
  chrome.windows.create({
    url: 'data/copy/index.html?content=' + encodeURIComponent(content),
    width: 400,
    height: 300,
    left: win.left + Math.round((win.width - 400) / 2),
    top: win.top + Math.round((win.height - 300) / 2),
    type: 'popup'
  });
});

// remove password for KW
{
  const once = () => chrome.storage.local.remove('kw:password');

  chrome.runtime.onInstalled.addListener(once);
  chrome.runtime.onStartup.addListener(once);
}
// messaging
chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.cmd === 'close-me') {
    chrome.scripting.executeScript({
      target: {
        tabId: sender.tab.id
      },
      func: () => {
        try {
          document.body.removeChild(window.iframe);
        }
        catch (e) {}
        delete window.iframe;
        window.focus();
        document.activeElement.focus();
      }
    });
  }
  else if (request.cmd === 'copy') {
    copy(request.password);
  }
  // since brings the KeePass to the front, the popup might get closed. So we need to do this in bg
  else if (request.cmd === 'associate') {
    const controller = new AbortController();

    setTimeout(() => controller.abort(), request.timeout);
    fetch(request.host, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request.obj),
      signal: controller.signal
    }).then(r => {
      if (r.ok) {
        return r.json();
      }
      throw Error('Cannot connect to KeePassHTTP. Either KeePass is not running or communication is broken');
    }).then(r => {
      chrome.storage.local.set({
        [r.Hash]: {
          id: r.Id,
          key: request.key
        }
      });
      response(r);
    }).catch(e => response({
      error: e.message
    }));

    return true;
  }
});

// Context Menu
{
  const callback = () => {
    chrome.contextMenus.create({
      id: 'generate-password',
      title: 'Generate a Random Password',
      contexts: ['action']
    });
    chrome.contextMenus.create({
      id: 'save-form',
      title: 'Save a new Login Form in KeePass',
      contexts: ['action']
    });
    chrome.contextMenus.create({
      id: 'auto-login',
      title: 'Perform auto-login for this URL',
      contexts: ['action'],
      enabled: false
    });
    chrome.contextMenus.create({
      id: 'encrypt-data',
      title: 'Encrypt or Decrypt a String',
      contexts: ['action']
    });
    chrome.contextMenus.create({
      id: 'open-keyboards',
      title: 'Keyboard Shortcut Settings',
      contexts: ['action']
    });
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
const onCommand = async (info, tab) => {
  if (info.menuItemId === 'save-form') {
    const target = {
      tabId: tab.id
    };

    try {
      // collect logins
      const r = await chrome.scripting.executeScript({
        target: {
          ...target,
          allFrames: true
        },
        func: () => {
          const forms = [...document.querySelectorAll('input[type=password]')]
            .map(p => {
              const form = p.closest('form');
              if (form) {
                return form;
              }
              // what if there is no form element
              let parent = p;
              for (let i = 0; i < 5; i += 1) {
                parent = parent.parentElement;
                if (parent.querySelector('input[type=text],input[type=email]')) {
                  return parent;
                }
              }
              return parent;
            }).filter((f, i, l) => f && l.indexOf(f) === i);

          return forms.map(f => {
            const usernames = [
              ...f.querySelectorAll('input[type=text]'),
              ...f.querySelectorAll('input[type=email]')
            ].flat().map(e => e.value).filter(s => s);
            const passwords = [...f.querySelectorAll('input[type=password]')]
              .map(e => e.value).filter(s => s);

            return {
              usernames,
              passwords
            };
          });
        }
      });

      const pairs = r.map(o => o.result).flat();

      await chrome.scripting.executeScript({
        target,
        func: pairs => {
          window.pairs = pairs;
        },
        args: [pairs]
      });

      await chrome.scripting.executeScript({
        target,
        files: ['/data/save/inject.js']
      });
    }
    catch (e) {
      console.warn(e);
      notify(tab, e);
    }
  }
  else if (info.menuItemId === 'open-keyboards') {
    chrome.tabs.create({
      url: 'chrome://extensions/configureCommands'
    });
  }
  else if (info.menuItemId === 'encrypt-data') {
    try {
      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        files: ['/data/safe/inject.js']
      });
    }
    catch (e) {
      notify(tab, e);
    }
  }
  else if (info.menuItemId === 'generate-password') {
    chrome.storage.local.get({
      charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
      length: 12
    }, prefs => {
      const array = new Uint8Array(prefs.length);
      crypto.getRandomValues(array);
      const password = [...array].map(n => Math.floor(n / 256 * prefs.charset.length) - 1)
        .map(n => prefs.charset[n]).join('');
      // copy to clipboard
      chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },
        func: password => {
          navigator.clipboard.writeText(password).catch(() => chrome.runtime.sendMessage({
            cmd: 'copy',
            password
          }));
        },
        args: [password]
      }).catch(() => copy(password));
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
                return prompt(
                  'What is the username to match with KeePass database?\n\nThis username must exactly match with one of the credentials stored in your KeePass database for this URL',
                  value
                );
              },
              args: [o?.username || '']
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
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      func: () => {
        window.iframe = document.createElement('iframe');
        window.iframe.setAttribute('style', `
          color-scheme: none;
          border: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 550px;
          height: 400px;
          max-width: 80%;
          margin-left: auto;
          margin-right: auto;
          background-color: #414141;
          z-index: 2147483647;
        `);
        window.iframe.tabindex = 0;
        document.body.appendChild(window.iframe);
        window.iframe.src = chrome.runtime.getURL('data/cmd/index.html');
      }
    });
  }
};
chrome.contextMenus.onClicked.addListener(onCommand);
chrome.commands.onCommand.addListener(command => chrome.tabs.query({
  currentWindow: true,
  active: true
}, tabs => onCommand({
  menuItemId: command
}, tabs[0])));

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const page = getManifest().homepage_url;
    const {name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, currentWindow: true}, tbs => tabs.create({
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
