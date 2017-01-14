/* globals KeePass */
'use strict';

chrome.commands.onCommand.addListener(() => {
  chrome.tabs.query({active: true, currentWindow: true}, t => {
    if (t.length) {
      chrome.tabs.executeScript(t[0].id, {
        file: 'data/cmd/inject.js',
        allFrames: false,
        runAt: 'document_start'
      });
    }
  });
});
chrome.browserAction.onClicked.addListener(tab => {
  chrome.tabs.executeScript(tab.id, {
    file: 'data/cmd/inject.js',
    allFrames: false,
    runAt: 'document_start'
  });
});

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.cmd === 'close-me' || request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(sender.tab.id, {
      code: `
        if (iframe) {
          document.body.removeChild(iframe);
        }
      `,
      runAt: 'document_start'
    });
  }
  if (request.cmd === 'logins') {
    let keepass = new KeePass();
    keepass.itl({
      url: request.query,
    }, (e, r) => response({
      error: e,
      response: r
    }));
    return true;
  }
  if (request.cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(sender.tab.id, {
      code: `
        (function (success) {
          if (success && ${request.cmd === 'insert-both'}) {
            let form = window.getSelection().focusNode.closest('form');
            if (form) {
              let password = form.querySelector('[type=password]');
              if (password) {
                password.focus();
                document.execCommand('selectAll', false, '');
                let v = document.execCommand('insertText', false, '${request.password}');
                if (v) {
                  form.submit();
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
            '${request.cmd === 'insert-password' ? request.password : request.login}'
          )
        );
        '';
      `,
      runAt: 'document_start'
    });
  }
});
// FAQs & Feedback
chrome.storage.local.get('version', prefs => {
  let version = chrome.runtime.getManifest().version;
  let isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;
  if (isFirefox ? !prefs.version : prefs.version !== version) {
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
