/* global KeePass, KeePassXC, KWPASS, TOTP SecureSyncedStorage */
const engine = {};

// otpauth://hotp/Secure%20App:alice%40google.com?secret=JBSWY3DPEHPK3PXP&issuer=Secure%20App&counter=0
engine.otp = string => {
  const i = string.indexOf('?');
  if (i !== -1) {
    string = string.substr(i);
  }
  // what if only secret is provided
  if (string.includes('secret=') === false && string.includes('key=') === false) {
    string = 'secret=' + encodeURIComponent(string);
  }

  const args = new URLSearchParams(string);
  const secret = args.get('key') || args.get('secret');
  if (!secret) {
    throw Error('no secret is detected');
  }
  const period = args.get('period') || 30;
  const digits = args.get('digits') || 6;

  const totp = new TOTP();
  return totp.generate(secret, period, digits);
};

engine.asyncOTP = uuid => {
  if (engine.core['get-totp']) {
    return engine.core['get-totp'](uuid);
  }
  return Promise.resolve();
};

// eslint-disable-next-line no-unused-vars
class SimpleStorage {
  read(prefs) {
    return new Promise(resolve => chrome.storage.local.get(prefs, resolve));
  }
  write(prefs) {
    return new Promise(resolve => chrome.storage.local.set(prefs, resolve));
  }
}

engine.hasSSDB = () => new Promise(resolve => chrome.storage.session.get({
  'ssdb-exported-key': ''
}, prefs => resolve(!!prefs['ssdb-exported-key'])));

engine.prepare = type => {
  engine.type = type;
  if (type === 'keepass') {
    engine.core = new KeePass();
  }
  else if (type === 'keepassxc') {
    engine.core = new KeePassXC();
  }
  else if (type === 'kwpass') {
    engine.core = new KWPASS();
  }
  else if (type === 'none') {
    engine.core = new class {
      async prepare() {}
      async 'get-logins'() {
        return [];
      }
      async 'set-login'() {
        throw Error('Not_Supported');
      }
      async 'get-totp'() {
        throw Error('Not_Supported');
      }
      async search() {
        return {
          Entries: []
        };
      }
      async set() {
        throw Error('Not_Supported');
      }
    };
  }

  return new Promise(resolve => {
    chrome.storage.session.get({
      'ssdb-exported-key': ''
    }, prefs => {
      const exportedKey = prefs['ssdb-exported-key'];

      if (exportedKey) {
        engine.ssdb = new SecureSyncedStorage();
        engine.ssdb.import(exportedKey).then(resolve);
      }
      else {
        resolve();
      }
    });
  }).then(() => engine.core.prepare());
};

engine.search = async query => {
  const responses = await engine.core.search(query);

  if (responses.Entries && engine.ssdb && query.url) {
    try {
      const uuids = await engine.ssdb.convert(query.url);
      const rs = [];
      for (const uuid of uuids) {
        const r = await engine.ssdb.find(uuid, undefined, (failed, succeeded, total) => {
          if (succeeded === 0 && total !== 0 && failed) {
            document.getElementById('notify')
              .notify('Unable to decrypt entries in secure storage. Incorrect password?', 'warning', 3000);
          }
          else if (failed) {
            console.info(
              `Can't decrypt certain entries in secure storage due to multiple passwords` +
              ` used for encrypting different entries within the domain.`
            );
          }
        });
        for (const o of r) {
          o.ssdb = true;
          o.href = query.url;
          o.group = '[Synced Storage]';
          o.Name = '';

          rs.push(o);
        }
      }
      rs.sort((a, b) => a.Login.localeCompare(b.Login));
      responses.Entries.unshift(...rs);
    }
    catch (e) {
      console.warn('unexpected error from SecureSyncedStorage', e);
    }
  }

  return responses;
};

engine.set = query => {
  return engine.core.set(query);
};

engine.connected = async type => {
  try {
    if (type === 'keepass') {
      await engine.core.test(false);
    }
    else if (type === 'keepassxc') {
      await engine.core['test-associate']();
    }
  }
  catch (e) {
    console.warn(e);

    const win = await chrome.windows.getCurrent();
    chrome.windows.create({
      url: '/connect/interface/index.html',
      width: 400,
      height: 300,
      left: win.left + Math.round((win.width - 400) / 2),
      top: win.top + Math.round((win.height - 300) / 2),
      type: 'popup'
    }, () => window.close());

    throw Error(e);
  }
};
