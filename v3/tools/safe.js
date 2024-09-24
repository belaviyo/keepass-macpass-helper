'use strict';

// eslint-disable-next-line no-unused-vars
class Safe {
  #key = '';

  #encoder = new TextEncoder();
  #decoder = new TextDecoder();

  #buffer(string) {
    const bytes = new Uint8Array(string.length);
    [...string].forEach((c, i) => bytes[i] = c.charCodeAt(0));
    return bytes;
  }

  async open(password) {
    this.#key = await crypto.subtle.digest({
      name: 'SHA-256'
    }, this.#encoder.encode(password)).then(result => crypto.subtle.importKey('raw', result, {
      name: 'AES-CBC'
    }, true, ['encrypt', 'decrypt']));
  }
  export() {
    return crypto.subtle.exportKey('raw', this.#key).then(ab => {
      return btoa(String.fromCharCode(...new Uint8Array(ab)));
    });
  }
  import(string) {/* Uint8Array */
    const decodedKeyData = new Uint8Array(Array.from(atob(string), c => c.charCodeAt(0)));

    return crypto.subtle.importKey('raw', decodedKeyData, {
      name: 'AES-CBC'
    }, true, ['encrypt', 'decrypt']).then(key => {
      this.#key = key;
    });
  }
  async encrypt(string) {
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const result = await crypto.subtle.encrypt({
      name: 'AES-CBC',
      iv
    }, this.#key, this.#encoder.encode(string));

    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.readAsDataURL(new Blob([iv, result], {type: 'text/enc'}));
    });
  }
  async decrypt(string) {
    // compatibility fix
    string = string.replace('data:application/octet-binary;base64,', '');

    const iv = crypto.getRandomValues(new Uint8Array(16));

    const result = await crypto.subtle.decrypt({
      name: 'AES-CBC',
      iv
    }, this.#key, this.#buffer(atob(string)));

    const ab = (new Uint8Array(result)).subarray(16);
    return this.#decoder.decode(ab);
  }
}
