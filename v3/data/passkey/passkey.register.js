/* "Add PassKey Support to this Site" context menu + registration sync.
   Injects passkeySupport.injects into the hosts listed in the
   `passkey-support-hosts` pref (comma-separated, Options page) by
   registering a persistent MAIN-world content script. */

const REG_ID = 'passkey-support-inject';
const HOSTS_KEY = 'passkey-support-hosts';

// normalize user input to bare hostnames ("https://a.b/x" -> "a.b")
const toHosts = value => (value || '').split(',').map(s => {
  s = s.trim().replace(/^https?:\/\//, '').split('/')[0];
  return s.toLowerCase();
}).filter(s => s);

// MAIN-world registered scripts are not supported by every engine (Firefox)
const registryReady = () => typeof chrome.scripting?.registerContentScripts === 'function';

// one registration for the whole list; re-created whenever the pref changes
const swUpdate = async () => {
  if (!registryReady()) {
    return;
  }
  // drop the previous registration (ignore the not-registered case)
  try {
    await chrome.scripting.unregisterContentScripts({
      ids: [REG_ID]
    });
  }
  catch (e) {}

  const prefs = await chrome.storage.local.get({
    [HOSTS_KEY]: ''
  });
  const hosts = toHosts(prefs[HOSTS_KEY]);
  if (hosts.length === 0) {
    return;
  }

  // each host matches itself and all of its subdomains
  const matches = hosts.flatMap(h => ['*://' + h + '/*', '*://*.' + h + '/*']);
  try {
    await chrome.scripting.registerContentScripts([{
      id: REG_ID,
      matches,
      js: ['/data/passkey/passkey.support.js', '/data/passkey/passkey.support.inject.js'],
      world: 'MAIN',
      runAt: 'document_start',
      persistAcrossSessions: true,
      allFrames: true,
      matchOriginAsFallback: true
    }]);
  }
  catch (e) {
    console.warn(e);
  }
};
// serialize the updates; concurrent refreshes race on unregister/register
let swSync = Promise.resolve();
const sync = () => {
  swSync = swSync.then(swUpdate).catch(e => console.warn(e));
  return swSync;
};

const once = () => {
  if (once.done) {
    return;
  }
  once.done = true;

  // parent menu is created by context.js' 'once' which runs first
  chrome.contextMenus.create({
    id: 'passkey-support',
    title: 'Add PassKey Support to This Site',
    contexts: ['action'],
    parentId: 'passkey'
  }, () => chrome.runtime.lastError);

  // reconcile registration after install/update; startup relies on
  // persistAcrossSessions
  sync();
};
chrome.runtime.onInstalled.addListener(once);
chrome.runtime.onStartup.addListener(once);

// the list lives in the pref; any change re-syncs the registration
chrome.storage.onChanged.addListener((ps, area) => {
  if (area === 'local' && ps[HOSTS_KEY]) {
    sync();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'passkey-support') {
    return;
  }
  tab = tab || await current();

  let url;
  try {
    url = new URL(tab.url);
  }
  catch (e) {}
  if (!url || !url.protocol.startsWith('http')) {
    return notify(tab, Error('Passkey support requires an http(s) page'));
  }

  const origin = url.origin + '/';
  chrome.permissions.request({
    origins: [origin]
  }, granted => {
    if (!granted) {
      return notify(tab, Error('Host permission was not granted'));
    }

    const host = url.hostname.toLowerCase();
    chrome.storage.local.get({
      [HOSTS_KEY]: ''
    }, prefs => {
      const hosts = new Set(toHosts(prefs[HOSTS_KEY]));
      hosts.add(host);
      chrome.storage.local.set({
        [HOSTS_KEY]: [...hosts].join(', ')
      }, () => {
        notify(tab, 'PassKey support is enabled for "' + host + '"', '✓', 'green', 3000);
      });
    });
  });
});
