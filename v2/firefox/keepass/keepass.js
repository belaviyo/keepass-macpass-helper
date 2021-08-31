/* globals sjcl */
'use strict';

const KeePass = function() {
  this.host = null;
  this.timeout = 5000;
};
window.KeePass = KeePass;

KeePass.prototype.post = function(obj, callback) {
  const req = new window.XMLHttpRequest();
  req.open('POST', this.host);
  const data = JSON.stringify(obj);
  req.responseType = 'json';
  req.setRequestHeader('Content-Type', 'application/json');
  req.timeout =
  req.onload = () => {
    callback(null, req.response);
  };
  req.ontimeout = () => {
    callback('Timeout! Try again...');
  };
  req.onerror = e => {
    callback(e.message || 'Cannot connect to KeePassHTTP. Either KeePass is not running or communication is broken');
  };
  req.send(data);
};
KeePass.prototype.iv = function(len = 16) {
  let iv = [];
  for (let i = 0; i < len; i++) {
    iv.push(String.fromCharCode(Math.floor(Math.random() * 256)));
  }
  iv = iv.join('');
  return btoa(iv);
};
KeePass.prototype.encrypt = function(data, iv) {
  const enc = sjcl.mode.cbc.encrypt(
    new sjcl.cipher.aes(sjcl.codec.base64.toBits(this.key)),
    sjcl.codec.utf8String.toBits(data),
    sjcl.codec.base64.toBits(iv)
  );
  return sjcl.codec.base64.fromBits(enc);
};
KeePass.prototype.decrypt = function(data, iv) {
  const dec = sjcl.mode.cbc.decrypt(
    new sjcl.cipher.aes(sjcl.codec.base64.toBits(this.key)),
    sjcl.codec.base64.toBits(data),
    sjcl.codec.base64.toBits(iv));
  return sjcl.codec.utf8String.fromBits(dec);
};
KeePass.prototype.verify = function(request) {
  const iv = this.iv();
  request.Nonce = iv;
  request.Verifier = this.encrypt(iv, iv);
  if (this.id) {
    request.Id = this.id;
  }
  return request;
};
KeePass.prototype.init = function(callback) {
  chrome.storage.local.get({
    host: 'http://localhost:19455'
  }, prefs => {
    this.host = prefs.host;
    // find database hash
    this.post({
      'RequestType': 'test-associate',
      'TriggerUnlock': false
    }, (e, r) => {
      if (e) {
        callback(e, r);
      }
      else if (r && r.Hash) {
        chrome.storage.local.get({
          [r.Hash]: {},
          id: '',
          key: ''
        }, prefs => {
          // overwrite based on database
          if (prefs[r.Hash].id && prefs[r.Hash].key) {
            Object.assign(this, prefs[r.Hash]);
          }
          else {
            Object.assign(this, {
              id: prefs.id,
              key: prefs.key
            });
          }
          callback();
        });
      }
      else {
        callback('Cannot detect database hash');
      }
    });
  });
};
KeePass.prototype.test = function(callback) {
  if (this.key) {
    let request = {
      'RequestType': 'test-associate',
      'TriggerUnlock': true
    };
    request = this.verify(request);
    this.post(request, callback);
  }
  else {
    callback(null, {
      Success: false,
      Error: 'There is no saved key'
    });
  }
};
KeePass.prototype.associate = function(callback) {
  this.key = this.iv(32);
  let request = {
    'RequestType': 'associate',
    'Key': this.key
  };
  request = this.verify(request);
  this.post(request, (e, r) => {
    if (r) {
      this.id = r.Id;
      chrome.storage.local.set({
        [r.Hash]: {
          id: r.Id,
          key: this.key
        }
      }, () => callback(e, r));
    }
  });
};
KeePass.prototype.logins = function({url, submiturl, realm}, callback) {
  let request = {
    'RequestType': 'get-logins',
    'TriggerUnlock': 'true',
    'SortSelection': 'false'
  };
  request = this.verify(request);
  const iv = request.Nonce;
  request.Url = this.encrypt(url, iv);
  if (submiturl) {
    request.SubmitUrl = this.encrypt(submiturl, iv);
  }
  if (realm) {
    request.Realm = this.encrypt(realm, iv);
  }
  this.post(request, (e, r) => {
    if (r && r.Entries) {
      const iv = r.Nonce;
      r.Entries = r.Entries.map(e => Object.assign(e, {
        Login: this.decrypt(e.Login, iv),
        Name: this.decrypt(e.Name, iv),
        Password: this.decrypt(e.Password, iv),
        StringFields: (e.StringFields || []).map(o => Object.assign({
          Key: this.decrypt(o.Key, iv).replace('KPH: ', ''),
          Value: this.decrypt(o.Value, iv)
        }))
      }));
    }
    callback(e, r);
  });
};
KeePass.prototype.set = function({url, submiturl, login, password}, callback) {
  let request = {
    'RequestType': 'set-login'
  };
  request = this.verify(request);
  const iv = request.Nonce;
  request = Object.assign(request, {
    'Login': this.encrypt(login, iv),
    'Password': this.encrypt(password, iv),
    'Url': this.encrypt(url, iv),
    'SubmitUrl': this.encrypt(submiturl, iv)
  });
  this.post(request, callback);
};
// tl: test -> logins
KeePass.prototype.tl = function({url, submiturl, realm}, callback) {
  this.test((e, r) => {
    if (e) {
      callback(e);
    }
    else if (r && r.Success) {
      this.logins({url, submiturl, realm}, callback);
    }
    else {
      this.associate((e, r) => {
        if (e) {
          callback(e);
        }
        else if (r && r.Success) {
          chrome.storage.local.set({
            id: r.Id
          }, () => {
            this.id = r.Id;
            this.itl({url, submiturl, realm}, callback);
          });
        }
        else {
          callback('Communication is rejected! Is your database open?');
        }
      });
    }
  });
};

// itl: init -> test -> logins
KeePass.prototype.itl = function({url, submiturl, realm}, callback) {
  this.init(() => this.tl({url, submiturl, realm}, callback));
};
// is init -> test -> set
KeePass.prototype.its = function(...args) {
  const [{url, submiturl, login, password}, callback] = args;
  this.init(() => {
    this.test((e, r) => {
      if (e) {
        callback(e);
      }
      else if (r && r.Success) {
        this.set({url, submiturl, login, password}, (e, r) => {
          if (r && r.Success) {
            callback();
          }
          else if (r) {
            callback(r.Error || 'something went wrong');
          }
          else {
            callback('Communication is rejected');
          }
        });
      }
      else {
        this.associate((e, r) => {
          if (e) {
            callback(e);
          }
          else if (r && r.Success) {
            this.its(...args);
          }
          else {
            callback('Communication is rejected');
          }
        });
      }
    });
  });
};
