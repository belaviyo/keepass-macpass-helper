/* global KeePass, KeePassXC, KWPASS, TOTP */
const engine = {};

// otpauth://hotp/Secure%20App:alice%40google.com?secret=JBSWY3DPEHPK3PXP&issuer=Secure%20App&counter=0
engine.otp = string => {
  const i = string.indexOf('?');
  if (i !== -1) {
    string = string.substr(i);
  }
  // what if only secret is provided
  if (string.includes('secret=') === false) {
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
  return engine.core.prepare();
};

engine.search = query => engine.core.search(query);

engine.set = query => engine.core.set(query);

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
