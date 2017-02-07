/* globals KeePass */
'use strict';

function onCommand (tab) {
  chrome.tabs.executeScript(tab.id, {
    file: 'data/cmd/inject.js',
    allFrames: true,
    matchAboutBlank: true,
    runAt: 'document_start'
  });
}
chrome.browserAction.onClicked.addListener(onCommand);

chrome.runtime.onMessage.addListener((request, sender, response) => {
  let id = sender.tab.id;
  let cmd = request.cmd;

  if (cmd === 'close-me' || request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: `
        if (iframe) {
          document.body.removeChild(iframe);
        }
      `,
      runAt: 'document_start',
      allFrames: false
    });
  }

  if (cmd === 'logins') {
    let keepass = new KeePass();
    keepass.itl({
      url: request.query,
    }, (e, r) => response({
      error: e,
      response: r
    }));
    return true;
  }
  else if (cmd === 'guesses') {
    chrome.tabs.sendMessage(id, request);
  }
  else if (request.cmd.startsWith('insert-')) {
    // escape "\"
    request.password = (request.password || '').replace(/\\/g, '\\');
    request.login = (request.login || '').replace(/\\/g, '\\\\');

    chrome.tabs.executeScript(id, {
      code: `
        if (aElement) {
          (function (success) {
            if (!success) {
              try {
                aElement.value = '${cmd === 'insert-password' ? request.password : request.login}';
              } catch (e) {}
            }
            if (${cmd === 'insert-both'}) {
              let form = aElement.closest('form');
              if (form) {
                let password = form.querySelector('[type=password]');
                if (password) {
                  password.focus();
                  document.execCommand('selectAll', false, '');
                  let v = document.execCommand('insertText', false, '${request.password}');
                  if (!v) {
                    try {
                      password.value = '${request.password}';
                    } catch (e) {}
                  }
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
              '${cmd === 'insert-password' ? request.password : request.login}'
            )
          );
        }
        '';
      `,
      runAt: 'document_start',
      allFrames: true,
      matchAboutBlank: true
    });
  }
});

function notify (message) {
  chrome.notifications.create({
    title: 'KeePassHelper',
    type: 'basic',
    iconUrl: 'data/icons/128.png',
    message
  });
}

function copy (str) {
  document.oncopy = (event) => {
    event.clipboardData.setData('text/plain', str);
    event.preventDefault();
  };
  document.execCommand('Copy', false, null);
}

// Context Menu
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

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-keyboards') {
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
      copy(password);
      // diplay notification
      notify('Generated password is copied to the clipboard');
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
