/* global KeePass, KeePassXC, KWPASS, jsOTP */
const engine = {};

engine.otp = string => {
  const i = string.indexOf('?');
  if (i !== -1) {
    string = string.substr(i);
  }
  const args = new URLSearchParams(string);
  const secret = args.get('key') || args.get('secret');
  if (!secret) {
    throw Error('no secret is detected');
  }
  const period = args.get('period') || 30;
  const digits = args.get('digits') || 6;

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
