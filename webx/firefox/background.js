/* globals KeePass, keepassxc, jsOTP, safe */
'use strict';

const storage = {};
const keepass = new KeePass();

jsOTP.exec = (secret, silent = false) => {
  if (secret.indexOf('key=') !== -1) {
    return (new jsOTP.totp()).getOtp(secret.split('key=')[1].split('&')[0]);
  }
  else if (secret.indexOf('secret=') !== -1) {
    return (new jsOTP.totp()).getOtp(secret.split('secret=')[1].split('&')[0]);
  }
  else {
    if (silent === false) {
      notify('"otp" string-field entry should have a value of "key=OTP_SECRET" format');
    }
    return 'invalid sectet';
  }
};

function notify(message) {
  chrome.notifications.create({
    title: 'KeePassHelper',
    type: 'basic',
    iconUrl: 'data/icons/128.png',
    message
  });
}
jsOTP.secure = (id, ensecret, silent = false) => {
  return new Promise((resolve, reject) => chrome.windows.create({
    url: 'data/prompt/index.html',
    type: 'popup',
    width: 600,
    height: 180,
    left: screen.availLeft + Math.round((screen.availWidth - 600) / 2),
    top: screen.availTop + Math.round((screen.availHeight - 180) / 2)
  }, w => {
    jsOTP.secure.cache[w.id] = {resolve, reject, silent, ensecret, id};
  }));
};
jsOTP.secure.cache = {};

function onCommand(id, callback = function() {}) {
  chrome.tabs.executeScript(id, {
    file: 'data/cmd/inject.js',
    allFrames: true,
    matchAboutBlank: true,
    runAt: 'document_start'
  }, () => {
    if (chrome.runtime.lastError) {
      notify(chrome.runtime.lastError.message);
    }
    callback();
  });
}
chrome.browserAction.onClicked.addListener(({id}) => onCommand(id));
chrome.commands.onCommand.addListener(() => tab().then(({id}) => {
  chrome.tabs.executeScript(id, {
    runAt: 'document_start',
    matchAboutBlank: true, // some popups are actually about:blank
    allFrames: false,
    code: 'window.inject = true;'
  }, () => onCommand(id));
}));

const onMessage = (request, sender, response) => {
  const id = request.tabId || (sender.tab ? sender.tab.id : -1);
  const cmd = request.cmd;
  if (cmd === 'close-me' || cmd.startsWith('insert-')) {
    chrome.tabs.executeScript(id, {
      code: `{
        try {
          document.body.removeChild(iframe)
        }
        catch(e) {}
        delete iframe;
        window.focus();
      }`,
      runAt: 'document_start',
      allFrames: false,
      matchAboutBlank: true
    }, () => chrome.runtime.lastError);
    chrome.tabs.executeScript(id, {
      code: `
        if (typeof aElement !== 'undefined' && aElement && !Array.isArray(aElement)) {
          aElement.focus();
          window.focus();
        }
      `,
      runAt: 'document_start',
      allFrames: true
    }, () => chrome.runtime.lastError);
  }

  if (cmd === 'command') {
    onCommand(request.tabId, response);
    return true;
  }
  else if (cmd === 'introduce-me') {
    response({
      url: sender.tab.url,
      id: sender.tab.id
    });
  }
  else if (cmd === 'fetch-guesses') {
    chrome.tabs.sendMessage(id, request, response);
    return true;
  }
  else if (cmd === 'notify') {
    notify(request.message);
  }
  else if (cmd === 'register-login') {
    login.json = request.json;
    login['auto-submit'] = request['auto-submit'];
    login.register();
  }
  else if (cmd === 'disable-login') {
    login.json = [];
    localStorage.setItem('json', '[]');
    login.register();
    chrome.tabs.remove(sender.tab.id);
  }
  else if (cmd === 'logins') {
    chrome.storage.local.get({
      engine: 'keepass'
    }, prefs => {
      (prefs.engine === 'keepass' ? keepass : keepassxc).itl(request, (e, r) => response({
        error: e,
        response: r
      }));
    });
    return true;
  }
  else if (cmd === 'save-form') {
    chrome.storage.local.get({
      engine: 'keepass'
    }, prefs => {
      (prefs.engine === 'keepass' ? keepass : keepassxc).its(request.data, e => {
        if (e) {
          notify(e.message || e);
        }
        else {
          notify('Successfully added to KeePass database');
        }
        response();
      });
    });
    return true;
  }
  else if (cmd === 'guesses' || cmd === 'collect') {
    chrome.tabs.sendMessage(id, request);
  }
  else if (cmd === 'vars') {
    response(storage[request.id]);
    // multiple requests may need this value
    window.setTimeout(() => delete storage[request.id], 2000);
  }
  else if (request.cmd.startsWith('insert-')) {
    const step = () => {
      const key = Math.random();
      storage[key] = {
        username: request.login,
        password: request.password,
        stringFields: request.stringFields
      };
      chrome.tabs.executeScript(id, {
        code: `
          var key = ${key};
          var cmd = '${cmd}';
          var doSubmit = ${request.detail !== 'no-submit'};
        `,
        runAt: 'document_start',
        allFrames: true,
        matchAboutBlank: true
      }, () => {
        if (chrome.runtime.lastError) {
          return notify(chrome.runtime.lastError.message);
        }
        chrome.tabs.executeScript(id, {
          file: 'data/insert.js',
          runAt: 'document_start',
          allFrames: true,
          matchAboutBlank: true
        });
      });
    };
    step();
  }
  else if (request.cmd === 'insert.js-otp') {
    if (request.sotp) {
      jsOTP.secure(id, request.sotp, true).then(response)
        .catch(e => notify(e.message || 'Cannot decrypt using the provided passphrase'));
      return true; // async request
    }
    else if (request.otp) {
      response(jsOTP.exec(request.otp || '', true));
    }
  }
  else if (cmd === 'cmd-otp') {
    copy(jsOTP.exec(request.value), null, 'OTP token is copied to the clipboard');
  }
  else if (cmd === 'cmd-sotp') {
    tab().then(t => jsOTP.secure(t.id, request.value).then(token => {
      copy(token, t.id, 'OTP token is copied to the clipboard');
    })).catch(e => notify(e.message || 'Cannot decrypt using the provided passphrase'));
  }
  else if (cmd === 'inject-embedded') {
    onCommand(sender.tab.id);
  }
  else if (cmd === 'prompt-resolved') {
    const o = jsOTP.secure.cache[sender.tab.windowId];
    if (o) {
      const {resolve, reject, silent, ensecret} = o;
      delete jsOTP.secure.cache[sender.tab.windowId];

      if (request.password) {
        safe.decrypt(ensecret, request.password).then(secret => jsOTP.exec(secret, silent)).then(resolve, reject);
      }
      else {
        reject(new Error('return value is empty'));
      }
    }
    else if (cmd === 'bring-to-front') {
      chrome.windows.update(sender.tab.windowId, {
        focused: true
      });
    }
  }
};
chrome.runtime.onMessage.addListener(onMessage);

function tab() {
  return new Promise((resolve, reject) => chrome.tabs.query({
    active: true,
    currentWindow: true
  }, tabs => {
    if (tabs && tabs.length) {
      resolve(tabs[0]);
    }
    else {
      reject(new Error('No active tab is detected'));
    }
  }));
}

function copy(str, tabId, msg) {
  navigator.clipboard.writeText(str).catch(() => new Promise(resolve => {
    document.oncopy = e => {
      e.clipboardData.setData('text/plain', str);
      e.preventDefault();
      resolve();
    };
    document.execCommand('Copy', false, null);
  })).then(() => notify(msg));
}

// auto login
const login = {
  'json': JSON.parse(localStorage.getItem('json') || '[]'),
  'auto-submit': localStorage.getItem('auto-submit') === 'true',
  'observe': d => {
    if (d.frameId === 0) {
      const o = login.json.filter(o => d.url.startsWith(o.url)).pop();
      if (o) {
        onMessage({
          cmd: 'logins',
          url: d.url
        }, {}, ({error, response}) => {
          if (!error && response) {
            const e = (response.Entries || []).filter(e => e.Login === o.username).pop();
            if (e) {
              // do we have a username field?
              chrome.tabs.executeScript(d.tabId, {
                runAt: 'document_start',
                allFrames: true,
                code: `(() => {
                  const forms = [...document.querySelectorAll('input[type=password]')]
                    .map(p => p.form)
                    .filter(f => f &&
                      (f.name || '').indexOf('reg') === -1 &&
                      (f.id || '').indexOf('reg') === -1 &&
                      (f.action || '').indexOf('join') === -1
                    );
                  aElement = [];

                  forms.forEach(f => {
                    aElement.push(...[...f.querySelectorAll('input:not([type=password])')]
                      .filter(i => (i.type === 'text' || i.type === 'email')));
                  });
                  return aElement.length;
                })()`
              }, (arr = []) => {
                // if there is a username input (aElement exists)
                if (arr.some(i => i)) {
                  onMessage({
                    tabId: d.tabId,
                    cmd: 'insert-both',
                    login: e.Login,
                    password: e.Password,
                    detail: login['auto-submit'] ? '' : 'no-submit',
                    stringFields: e.StringFields
                  });
                }
              });
            }
          }
        });
      }
    }
  },
  'register': () => {
    if (chrome.webNavigation) {
      chrome.webNavigation.onDOMContentLoaded.removeListener(login.observe);
      if (login.json.length) {
        chrome.webNavigation.onDOMContentLoaded.addListener(login.observe);
      }
    }
    else if (login.json.length) {
      chrome.windows.create({
        url: 'data/permission/index.html',
        type: 'popup',
        width: 400,
        height: 250,
        left: screen.availLeft + Math.round((screen.availWidth - 400) / 2),
        top: screen.availTop + Math.round((screen.availHeight - 250) / 2)
      });
    }
  }
};
login.register();

// Context Menu
{
  const callback = () => {
    if (/Firefox/.test(navigator.userAgent) === false) {
      chrome.contextMenus.create({
        id: 'open-keyboards',
        title: 'Keyboard Shortcut Settings',
        contexts: ['browser_action']
      });
    }
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
    chrome.contextMenus.create({
      id: 'auto-login',
      title: 'Perform auto-login for this URL',
      contexts: ['browser_action']
    });
    chrome.contextMenus.create({
      id: 'encrypt-data',
      title: 'Encrypt or decrypt a string data',
      contexts: ['browser_action']
    });
    if (chrome.contextMenus.ContextType.PASSWORD) {
      chrome.contextMenus.create({
        id: 'inject-embedded',
        title: 'Open credentials in the embedded mode',
        contexts: ['password']
      });
    }
  };
  chrome.runtime.onInstalled.addListener(callback);
  chrome.runtime.onStartup.addListener(callback);
}
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
  else if (info.menuItemId === 'auto-login') {
    let key = document.cookie.split(`${(new URL(tab.url)).hostname}=`);
    if (key.length > 1) {
      key = key[1].split(';')[0];
    }
    else {
      key = '';
    }

    chrome.tabs.executeScript(tab.id, {
      runAt: 'document_start',
      allFrames: false,
      code: `window.prompt('What is the username to match with KeePass database? This username must exactly match with one of the credentials stored in your KeePass database for this URL', '${key}')`
    }, (arr = []) => {
      if (chrome.runtime.lastError) {
        return notify(chrome.runtime.lastError.message);
      }
      const username = (arr[0] || '').trim();
      if (username) {
        login.json.push({
          url: tab.url.split('?')[0],
          username
        });
        localStorage.setItem('json', JSON.stringify(login.json));
        login.register();
        notify(`A new automatic login is registered for this URL.

To fill the credential automatically refresh the page.`);
      }
    });
  }
  else if (info.menuItemId === 'encrypt-data') {
    chrome.tabs.executeScript(tab.id, {
      file: '/data/safe/inject.js',
      runAt: 'document_start'
    }, () => chrome.runtime.lastError && notify(chrome.runtime.lastError.message));
  }
  else if (info.menuItemId === 'inject-embedded') {
    chrome.tabs.executeScript({
      code: 'window.inject = true;'
    }, () => {
      onCommand(tab.id);
    });
  }
  else {
    chrome.storage.local.get({
      charset: 'qwertyuioplkjhgfdsazxcvbnmQWERTYUIOPLKJHGFDSAZXCVBNM1234567890',
      length: 12
    }, prefs => {
      const array = new Uint8Array(prefs.length);
      window.crypto.getRandomValues(array);
      const password = [...array].map(n => Math.floor(n / 256 * prefs.charset.length) - 1)
        .map(n => prefs.charset[n]).join('');
      // copy to clipboard
      copy(password, tab.id, 'Generated password is copied to the clipboard');
    });
  }
});

// panel-view modes
{
  const c1 = bol => chrome.browserAction.setPopup({
    popup: bol ? '' : '/data/cmd/index.html'
  });
  const c2 = () => chrome.storage.local.get({
    embedded: false
  }, prefs => c1(prefs.embedded));

  chrome.runtime.onInstalled.addListener(c2);
  chrome.runtime.onStartup.addListener(c2);
  chrome.storage.onChanged.addListener(prefs => prefs.embedded && c1(prefs.embedded.newValue));
}

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
            tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install'
            });
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
