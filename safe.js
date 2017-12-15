'use strict';

var safe = {};

{
  function convertStringToArrayBufferView(str) {
    var bytes = new Uint8Array(str.length);
    for (var iii = 0; iii < str.length; iii++) {
      bytes[iii] = str.charCodeAt(iii);
    }
    return bytes;
  }
  function convertArrayBufferViewtoString(buffer) {
    var str = '';
    for (var iii = 0; iii < buffer.byteLength; iii++) {
      str += String.fromCharCode(buffer[iii]);
    }
    return str;
  }
  function passwordToKey(password) {
    return crypto.subtle.digest({
      name: 'SHA-256'
    }, convertStringToArrayBufferView(password)).then(result => crypto.subtle.importKey('raw', result, {
      name: 'AES-CBC'
    }, false, ['encrypt', 'decrypt']));
  }

  safe.encrypt = (data, password) => {
    const iv = crypto.getRandomValues(new Uint8Array(16));

    return passwordToKey(password).then(key => crypto.subtle.encrypt({
      name: 'AES-CBC',
      iv
    }, key, convertStringToArrayBufferView(data))
    .then(result => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(new Blob([iv, result], {type: 'application/octet-binary'}));
    })));
  };
  safe.decrypt = (data, password) => {
    const iv = crypto.getRandomValues(new Uint8Array(16));

    return passwordToKey(password).then(key => crypto.subtle.decrypt({
      name: 'AES-CBC',
      iv
    }, key, convertStringToArrayBufferView(atob(data.split(',')[1])))
      .then(result => convertArrayBufferViewtoString((new Uint8Array(result)).subarray(16))));
  };
}
