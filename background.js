/* globals KeePass */
'use strict';

function onCommand (tab) {
  chrome.tabs.executeScript(tab.id, {
    file: 'data/cmd/inject.js',
    allFrames: true,
    matchAboutBlank: true,
    runAt: 'document_start'
  }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
}
chrome.browserAction.onClicked.addListener(onCommand);

function notify (message) {
  chrome.notifications.create({
    title: 'KeePassHelper',
    type: 'basic',
    iconUrl: 'data/icons/128.png',
    message
  });
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
  let id = sender.tab.id;
  let cmd = request.cmd;

  if (cmd === 'close-me' || request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: `iframe && document.body.removeChild(iframe) && window.focus()`,
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
    keepass.its(request.data, (e) => {
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
  else if (request.cmd.startsWith('insert-')) {
    // escape "`", "\" chars
    request.password = (request.password || '').replace(/([\\`])/g, '${"\\$1"}');
    request.login = (request.login || '').replace(/([\\`])/g, '${"\\$1"}');

    chrome.tabs.executeScript(id, {
      code: `
        function onChange (e) {
          e.dispatchEvent(new Event('change', {bubbles: true}));
          e.dispatchEvent(new Event('input', {bubbles: true}));
        }
        if (aElement) {
          (function (success) {
            if (!success) {
              try {
                aElement.value = String.raw\`${cmd === 'insert-password' ? request.password : request.login} \`.slice(0, -1);
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
                  let v = document.execCommand('insertText', false, String.raw\`${request.password} \`.slice(0, -1));
                  if (!v) {
                    try {
                      password.value = String.raw\`${request.password} \`.slice(0, -1);
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
              String.raw\`${cmd === 'insert-password' ? request.password : request.login} \`.slice(0, -1)
            )
          );
        }
        '';
      `,
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
  }
});

function copy (str, tabId) {
  chrome.tabs.executeScript(tabId, {
    allFrames: false,
    runAt: 'document_start',
    code: `
      document.oncopy = (event) => {
        event.clipboardData.setData('text/plain', String.raw\`${str.replace(/([\\`])/g, '${"\\$1"}')}\`);
        event.preventDefault();
      };
      window.focus();
      document.execCommand('Copy', false, null);
    `
  }, () => {
    notify(
      chrome.runtime.lastError ?
        'Cannot copy to the clipboard on this page!' :
        'Generated password is copied to the clipboard'
    );
  });
}

// Context Menu
(function (callback) {
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
})(function () {
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
      let password = Array.apply(null, new Array(prefs.length))
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
  'faqs': navigator.userAgent.toLowerCase().indexOf('firefox') === -1 ? true : false
}, prefs => {
  let version = chrome.runtime.getManifest().version;

  if (prefs.version ? (prefs.faqs && prefs.version !== version) : true) {
    chrome.storage.local.set({version}, () => {
      chrome.tabs.create({
        url: 'http://add0n.com/keepass-helper.html?version=' + version +
          '&type=' + (prefs.version ? ('upgrade&p=' + prefs.version) : 'install')
      });
    });
  }
});
(function () {
  let {name, version} = chrome.runtime.getManifest();
  chrome.runtime.setUninstallURL('http://add0n.com/feedback.html?name=' + name + '&version=' + version);
})();
