/* globals sjcl */
'use strict';

var KeePass = function () {
  this.port = null;
  this.key = '';
  this.id = '';
};
KeePass.prototype.init = function (callback) {
  chrome.storage.local.get({
    port: 19455,
    key: '',
    id: ''
  }, prefs => {
    this.port = prefs.port;
    this.id = prefs.id;
    if (prefs.key) {
      this.key = prefs.key;
    }
    else {
      this.key = this.iv(32);
      chrome.storage.local.set({
        key: this.key
      });
    }
    callback();
  });
};
KeePass.prototype.post = function (obj, callback) {
  let req = new window.XMLHttpRequest();
  req.open('POST', 'http://localhost:' + this.port);
  let data = JSON.stringify(obj);
  req.responseType = 'json';
  req.setRequestHeader('Content-Type', 'application/json');
  req.onload = () => {
    callback(null, req.response);
  };
  req.onerror = (e) => callback(e.message);
  req.send(data);
};
KeePass.prototype.iv = function (len = 16) {
  let iv = [];
  for (let i = 0; i < len; i++) {
    iv.push(String.fromCharCode(Math.floor(Math.random() * 256)));
  }
  iv = iv.join('');
  return btoa(iv);
};
KeePass.prototype.encrypt = function (data, iv) {
  let enc = sjcl.mode.cbc.encrypt(
    new sjcl.cipher.aes(sjcl.codec.base64.toBits(this.key)),
    sjcl.codec.utf8String.toBits(data),
    sjcl.codec.base64.toBits(iv)
  );
  return sjcl.codec.base64.fromBits(enc);
};
KeePass.prototype.decrypt = function (data, iv) {
  let dec = sjcl.mode.cbc.decrypt(
    new sjcl.cipher.aes(sjcl.codec.base64.toBits(this.key)),
    sjcl.codec.base64.toBits(data),
    sjcl.codec.base64.toBits(iv));
  return sjcl.codec.utf8String.fromBits(dec);
};
KeePass.prototype.verify = function (request) {
  let iv = this.iv();
  request.Nonce = iv;
  request.Verifier = this.encrypt(iv, iv);
  if (this.id) {
    request.Id = this.id;
  }
  return request;
};
KeePass.prototype.test = function (callback) {
  let request = {
    'RequestType': 'test-associate',
    'TriggerUnlock': false
  };
  request = this.verify(request);
  this.post(request, callback);
};
KeePass.prototype.associate = function (callback) {
  let request = {
    'RequestType': 'associate',
    'Key': this.key
  };
  request = this.verify(request);
  this.post(request, callback);
};
KeePass.prototype.logins = function ({url, submiturl, realm}, callback) {
  let request = {
    'RequestType': 'get-logins',
    'TriggerUnlock': 'false',
    'SortSelection': 'false'
  };
  request = this.verify(request);
  let iv = request.Nonce;
  request.Url = this.encrypt(url, iv);
  if (submiturl) {
    request.SubmitUrl = this.encrypt(submiturl, iv);
  }
  if (realm) {
    request.Realm = this.encrypt(realm, iv);
  }
  this.post(request, (e, r) => {
    if (r && r.Entries) {
      let iv = r.Nonce;
      r.Entries = r.Entries.map(e => {
        return Object.assign(e, {
          Login: this.decrypt(e.Login, iv),
          Name: this.decrypt(e.Name, iv),
          Password: this.decrypt(e.Password, iv)
        });
      });
    }
    callback(e, r);
  });
};
// itl: init -> test -> logins
KeePass.prototype.itl = function ({url, submiturl, realm}, callback) {
  this.init(() => {
    this.test((e, r) => {
      if (e) {
        callback(e);
      }
      else if (r.Success) {
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
            callback('Communication is rejected');
          }
        });
      }
    });
  });
};
