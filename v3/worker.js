const notify = (tab, e) => {
  chrome.action.setBadgeText({
    tabId: tab.id,
    text: 'E'
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
chrome.runtime.onMessage.addListener((request, sender) => {
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
      contexts: ['action']
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
    chrome.scripting.executeScript({
      target: {
        tabId: tab.id
      },
      files: ['/data/safe/inject.js']
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
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
};
chrome.contextMenus.onClicked.addListener(onCommand);
chrome.commands.onCommand.addListener(command => chrome.tabs.query({
  currentWindow: true,
  active: true
}, tabs => onCommand({
  menuItemId: command
}, tabs[0])));
