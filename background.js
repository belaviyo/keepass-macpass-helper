/* globals KeePass */
'use strict';

var storage = {};

function notify(message) {
  chrome.notifications.create({
    title: 'KeePassHelper',
    type: 'basic',
    iconUrl: 'data/icons/128.png',
    message
  });
}

function onCommand(tab) {
  chrome.tabs.executeScript(tab.id, {
    file: 'data/cmd/inject.js',
    allFrames: true,
    matchAboutBlank: true,
    runAt: 'document_start'
  }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
}
chrome.browserAction.onClicked.addListener(onCommand);

chrome.runtime.onMessage.addListener((request, sender, response) => {
  const id = sender.tab.id;
  const cmd = request.cmd;

  if (cmd === 'close-me' || request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: 'iframe && document.body.removeChild(iframe) && window.focus()',
      runAt: 'document_start',
      allFrames: false
    });
    chrome.tabs.executeScript(id, {
      code: `typeof aElement !== 'undefined' && aElement && aElement.focus()`,
      runAt: 'document_start',
      allFrames: true
    });
  }

  if (cmd === 'notify') {
    notify(request.message);
  }
  else if (cmd === 'logins') {
    const keepass = new KeePass();
    keepass.itl({
      url: request.query,
    }, (e, r) => response({
      error: e,
      response: r
    }));
    return true;
  }
  else if (cmd === 'save-form') {
    const keepass = new KeePass();
    keepass.its(request.data, e => {
      if (e) {
        notify(e.message || e);
      }
      else {
        notify('Successfully added to KeePass database');
      }
      response();
    });
    return true;
  }
  else if (cmd === 'guesses') {
    chrome.tabs.sendMessage(id, request);
  }
  else if (cmd === 'vars') {
    response(storage[request.id]);
    delete storage[request.id];
  }
  else if (request.cmd.startsWith('insert-')) {
    const key = Math.random();
    storage[key] = {
      username: request.login,
      password: request.password
    };

    chrome.tabs.executeScript(id, {
      code: `
        chrome.runtime.sendMessage({
          cmd: 'vars',
          id: ${key}
        }, ({username, password}) => {
          function onChange (e) {
            e.dispatchEvent(new Event('change', {bubbles: true}));
            e.dispatchEvent(new Event('input', {bubbles: true}));
          }
          if (aElement) {
            (function (success) {
              if (!success) {
                try {
                  aElement.value = ${cmd === 'insert-password'} ? password : username;
                } catch (e) {}
              }
              onChange(aElement);
              if (${cmd === 'insert-both'}) {
                let form = aElement.closest('form');
                if (form) {
                  let password = form.querySelector('[type=password]');
                  if (password) {
                    password.focus();
                    document.execCommand('selectAll', false, '');
                    let v = document.execCommand('insertText', false, password);
                    if (!v) {
                      try {
                        password.value = password;
                      } catch (e) {}
                    }
                    onChange(password);
                    if ('${request.detail}' !== 'no-submit') {
                      // submit
                      let button = form.querySelector('input[type=submit]') || form.querySelector('[type=submit]');
                      if (button) {
                        button.click();
                      }
                      else {
                        let onsubmit = form.getAttribute('onsubmit');
                        if (onsubmit && onsubmit.indexOf('return false') === -1) {
                          form.onsubmit();
                        }
                        else {
                          form.submit();
                        }
                      }
                    }
                    window.focus();
                    password.focus();
                  }
                }
              }
              else {
                aElement.focus();
                window.focus();
              }
            })(
              document.execCommand('selectAll', false, '') &&
              document.execCommand(
                'insertText',
                false,
                ${cmd === 'insert-password'} ? password : username
              )
            );
          }
        });
      `,
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
  }
});

function copy(str, tabId) {
  if (/Firefox/.test(navigator.userAgent)) {
    const id = Math.random();
    storage[id] = str;
    chrome.tabs.executeScript(tabId, {
      allFrames: false,
      runAt: 'document_start',
      code: `
        chrome.runtime.sendMessage({
          cmd: 'vars',
          id: ${id}
        }, password => {
          document.oncopy = (event) => {
            event.clipboardData.setData('text/plain', password);
            event.preventDefault();
          };
          window.focus();
          document.execCommand('Copy', false, null);
        });
      `
    }, () => {
      notify(
        chrome.runtime.lastError ?
          'Cannot copy to the clipboard on this page!' :
          'Generated password is copied to the clipboard'
      );
    });
  }
  else {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      notify('Generated password is copied to the clipboard');
    };
    document.execCommand('Copy', false, null);
  }
}

// Context Menu
(function(callback) {
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
})(function() {
  chrome.contextMenus.create({
    id: 'open-keyboards',
    title: 'Keyboard Shortcut Settings',
    contexts: ['browser_action']
  });
  chrome.contextMenus.create({
    id: 'generate-password',
    title: 'Generate a Random Password',
    contexts: ['browser_action']
  });
  chrome.contextMenus.create({
    id: 'save-form',
    title: 'Save a new login form in KeePass',
    contexts: ['browser_action']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-form') {
    chrome.tabs.executeScript(tab.id, {
      file: '/data/save/inject.js',
      runAt: 'document_start',
      allFrames: true
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
  }
  else if (info.menuItemId === 'open-keyboards') {
    chrome.tabs.create({
      url: 'chrome://extensions/configureCommands'
    });
  }
  else {
    chrome.storage.local.get({
      charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
      length: 12
    }, prefs => {
      const password = Array.apply(null, new Array(prefs.length))
        .map(() => prefs.charset.charAt(Math.floor(Math.random() * prefs.charset.length)))
        .join('');
      // copy to clipboard
      copy(password, tab.id);
    });
  }
});

// FAQs & Feedback
chrome.storage.local.get({
  'version': null,
  'faqs': !/Firefox/.test(navigator.userAgent)
}, prefs => {
  const version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/keepass-helper.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});
(function() {
  const {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
})();
