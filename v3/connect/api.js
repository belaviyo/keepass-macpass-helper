/* global KeePass, KeePassXC, KWPASS, jsOTP */
const engine = {};

engine.otp = string => {
  // otpauth://hotp/Secure%20App:alice%40google.com?secret=JBSWY3DPEHPK3PXP&issuer=Secure%20App&counter=0

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

  // eslint-disable-next-line new-cap
  return (new jsOTP.totp(period, digits)).getOtp(secret);
};

engine.prepare = async type => {
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
  await engine.core.prepare();
};

engine.search = async query => {
  return engine.core.search(query);
};

engine.set = async query => {
  return engine.core.set(query);
};

// perform "associate" in background since the interface might get closed on some browsers
KeePassXC.prototype.associate = function() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      cmd: 'associate',
      type: 'xc',
      clientID: this.clientID,
      nativeID: this.nativeID,
      db: this.db
    }, o => {
      if (o.error) {
        return reject(Error(o.error));
      }

      this.serverPublicKey = new Uint8Array(o.serverPublicKey);
      this.keyPair = {
        publicKey: new Uint8Array(o.keyPair.publicKey),
        secretKey: new Uint8Array(o.keyPair.secretKey)
      };
      this.key = o.key;
      resolve();
    });
  });
};
KeePass.prototype.associate = function() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      cmd: 'associate',
      type: 'kp'
    }, o => {
      if (o.error) {
        return reject(Error(o.error));
      }
      this.id = o.id;
      this.key = o.key;
      resolve(o.r);
    });
  });
};
