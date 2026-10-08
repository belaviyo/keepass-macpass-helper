/* global passkey */

if (typeof importScripts !== 'undefined') {
  self.importScripts('/data/passkey/passkey.support.js');
  self.importScripts('/data/passkey/passkey.create.js');
  self.importScripts('/context.js');
  self.importScripts('/data/passkey/passkey.register.js');
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
    const {persist, features, key} = passkey.set.args.get(sender.tab.id);
    // clean up
    try {
      chrome.tabs.onUpdated.removeListener(persist);

      passkey.args.delete(sender.tab.id);
    }
    catch (e) {}

    // show interface
    chrome.windows.getCurrent().then(win => {
      const args = new URLSearchParams();

      if (features['backed-up']) {
        request.data.FLAGS.push('BS');
      }
      request.data.PRIVATE_KEY_PEM = key;

      args.set('data', JSON.stringify(request.data, undefined, '  ').replaceAll('\\\\n', '\\n'));
      args.set('href', sender.tab.url);

      chrome.windows.create({
        url: '/data/passkey/index.html?' + args.toString(),
        width: 700,
        height: 800,
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
// MCP support
chrome.runtime.onMessageExternal.addListener((request, sender, response) => {
  if (request.cmd === 'mcp.json') {
    fetch('mcp/mcp.json').then(r => r.json()).then(response);
    return true;
  }
  else if (request.cmd === 'mcp.output') {
    fetch('mcp/mcp.output').then(r => r.text()).then(response);
    return true;
  }
  else {
    response({
      error: 'unknown-request'
    });
  }
});
// External Access
chrome.runtime.onConnectExternal.addListener(eport => {
  eport.onMessage.addListener(async request => {
    if (request.cmd === 'ask-for-credential') {
      const args = new URLSearchParams();
      args.set('mode', 'detached');
      if (request.href) {
        args.set('href', request.href);
      }
      if (request.tabid) {
        args.set('tabid', request.tabid);
      }
      if (request.instruction) {
        args.set('instruction', request.instruction);
      }
      if (eport.sender.id) {
        args.set('title', 'Credential request by "' + eport.sender.id + '" :: KeePassHelper');
      }

      // listen for port connection for 5 seconds
      const msgs = [];
      const observe = iport => {
        chrome.runtime.onConnect.removeListener(observe);
        iport.onDisconnect.addListener(() => {
          if (!request.stream && msgs.length) {
            eport.postMessage(msgs);
          }
          eport.disconnect();
        });
        iport.onMessage.addListener(msg => request.stream ? eport.postMessage(msg) : msgs.push(msg));
      };
      chrome.runtime.onConnect.addListener(observe);

      const win = await chrome.windows.create({
        url: '/data/cmd/index.html?' + args.toString(),
        width: 600,
        height: 800,
        type: 'popup'
      });
      eport.onDisconnect.addListener(() => {
        chrome.windows.remove(win.id).catch(() => {});
      });
      setTimeout(() => {
        chrome.runtime.onConnect.removeListener(observe);
      }, 5000);
    }
  });
});



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
