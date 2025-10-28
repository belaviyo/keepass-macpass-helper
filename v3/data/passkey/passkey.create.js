/* global PublicKeyCredential, AuthenticatorAttestationResponse */

const passkey = {};

passkey.set = async (tabId, features) => {
  const target = {
    tabId,
    allFrames: true
  };
  const pem = {
    async export(privateKey) { // CryptoKey to PEM
      const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
      const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
      const exportedAsBase64 = btoa(exportedAsString).replace(/\s/g, '');
      const pem = `-----BEGIN PRIVATE KEY-----
${exportedAsBase64.match(/.{1,64}/g).join('\n')}
-----END PRIVATE KEY-----`;
      return pem;
    }
  };

  // Generate EC key pair
  // Only share public key inside MAIN world
  const keyPair = await crypto.subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, true, ['sign', 'verify']);

  await chrome.scripting.executeScript({
    target,
    func: (key, features) => {
      const port = document.createElement('span');
      port.id = 'kph-tsGhyft';
      document.documentElement.appendChild(port);
      port.addEventListener('copy-data', e => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const FLAGS = ['AT', 'UP', 'UV', 'BE'];
        if (features['backed-up']) {
          FLAGS.push('BS');
        }
        chrome.runtime.sendMessage({
          cmd: 'passkey-interface',
          data: {
            PRIVATE_KEY_PEM: key,
            ...e.detail,
            FLAGS,
            CREATE_BY: 'KPH@' + chrome.runtime.getManifest().version
          }
        });
      });
    },
    args: [await pem.export(keyPair.privateKey), features]
  });
  await chrome.scripting.executeScript({
    target,
    world: 'MAIN',
    func: (pub, features) => {
      const port = document.getElementById('kph-tsGhyft');
      port.remove();

      const base64 = {
        encode(buffer) { // base64url encode
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
      };
      const cbor = (() => {
        function encodeLength(b, len, major) {
          if (len < 24) {
            b.push((major << 5) | len);
          }
          else if (len <= 0xff) {
            b.push((major << 5) | 0x18, len);
          }
          else if (len <= 0xffff) {
            b.push((major << 5) | 0x19, (len >> 8) & 0xff, len & 0xff);
          }
          else {
            throw new Error('Length too large');
          }
        }

        function encodeValue(b, val) {
          if (typeof val === 'number') {
            if (val >= 0) {
              encodeLength(b, val, 0);
            }
            else {
              const abs = -val - 1;
              encodeLength(b, abs, 1);
            }
          }
          else if (typeof val === 'string') {
            const enc = new TextEncoder().encode(val);
            encodeLength(b, enc.length, 3);
            b.push(...enc);
          }
          else if (val instanceof ArrayBuffer) {
            const bytes = new Uint8Array(val);
            encodeLength(b, bytes.length, 2);
            b.push(...bytes);
          }
          else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            const keys = Object.keys(val);
            encodeLength(b, keys.length, 5);
            for (const kstr of keys) {
              const k = Number(kstr);
              if (!isNaN(k)) {
                if (k >= 0) {
                  encodeLength(b, k, 0);
                }
                else {
                  const abs = -k - 1;
                  encodeLength(b, abs, 1);
                }
              }
              else {
                const enc = new TextEncoder().encode(kstr);
                encodeLength(b, enc.length, 3);
                b.push(...enc);
              }
              encodeValue(b, val[kstr]);
            }
          }
          else {
            throw new Error('Unsupported type');
          }
        }

        return {
          encode(obj) {
            const b = [];
            encodeValue(b, obj);
            return new Uint8Array(b).buffer;
          }
        };
      })();

      const buildCreateAuthenticatorData = async (rpId, credId, coseKey) => {
        const rpIdHash = new Uint8Array(await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(rpId)
        )); // 32 bytes

        let flagsValue = 0x45; // AT + UP + UV
        // https://github.com/keepassium/keepassium/issues/444/
        flagsValue |= 0x08; // Add BE
        if (features['backed-up']) {
          flagsValue |= 0x10; // Add BS (only if actually backed up)
        }
        const flags = new Uint8Array([flagsValue]); // AT + UP + UV
        const signCount = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
        // Fixed for this extension
        const aaguid = new Uint8Array([220, 21, 28, 38, 217, 69, 68, 233, 164, 85, 106, 141, 33, 91, 81, 3]);

        const credLen = credId.byteLength;
        const credLenBytes = new Uint8Array([(credLen >> 8) & 0xff, credLen & 0xff]);

        const coseBytes = new Uint8Array(coseKey);

        // concatenate
        const totalLen = 32 + 1 + 4 + 16 + 2 + credId.byteLength + coseBytes.length;
        const buffer = new Uint8Array(totalLen);
        let offset = 0;
        buffer.set(rpIdHash, offset); offset += 32;
        buffer.set(flags, offset); offset += 1;
        buffer.set(signCount, offset); offset += 4;
        buffer.set(aaguid, offset); offset += 16;
        buffer.set(credLenBytes, offset); offset += 2;
        buffer.set(new Uint8Array(credId), offset); offset += credId.byteLength;
        buffer.set(coseBytes, offset);

        return buffer.buffer;
      };

      const createPublicKeyCredential = (publicKey, response, id, rawId) => {
        const publicKeyCredential = {
          authenticatorAttachment: 'platform',
          id,
          type: 'public-key',
          rawId,
          response,
          clientExtensionResults() {
            return publicKey?.response?.clientExtensionResults || {};
          },
          getClientExtensionResults() {
            return publicKey?.response?.clientExtensionResults || {};
          }
        };
        Object.setPrototypeOf(publicKeyCredential, PublicKeyCredential.prototype);

        return publicKeyCredential;
      };

      const create = async options => {
        const {challenge, rp, user} = options.publicKey;
        if (!rp || !rp.id) {
          console.error(options);
          throw new DOMException('PASSKEYS_DOMAIN_RPID_MISMATCH', DOMException.SECURITY_ERR);
        }
        if (!user || !user.id) {
          console.error(options);
          throw new TypeError('PASSKEYS_INVALID_USER_ID');
        }
        if (!((user.id.buffer || user.id) instanceof ArrayBuffer)) {
          console.error(options);
          throw new TypeError('PASSKEYS_INVALID_USER_ID');
        }

        // Generate random credential ID (32 bytes)
        const credIdBytes = new Uint8Array(32);
        crypto.getRandomValues(credIdBytes);
        const credId = credIdBytes.buffer;
        const credIdB64 = base64.encode(credId);

        // Export public key raw
        const pubRawU8 = new Uint8Array(pub);
        const pubRaw = pubRawU8.buffer;
        if (pubRawU8[0] !== 0x04) {
          throw new DOMException('Unexpected_Public_Key_Format', 'NotAllowedError');
        }
        const x = pubRaw.slice(1, 33);
        const y = pubRaw.slice(33);

        // COSE public key
        const coseKey = cbor.encode({
          '1': 2, // kty: EC2
          '3': -7, // alg: ES256
          '-1': 1, // crv: P-256
          '-2': x,
          '-3': y
        });

        // Build authenticatorData for create
        const authData = await buildCreateAuthenticatorData(rp.id, credId, coseKey);

        // Build clientDataJSON
        const clientDataJSON = new TextEncoder().encode(JSON.stringify({
          type: 'webauthn.create',
          challenge: base64.encode(challenge.buffer || challenge),
          origin: location.origin,
          crossOrigin: false
        }));

        const attestationObject = cbor.encode({
          fmt: 'none',
          attStmt: {},
          authData
        });

        // Response
        const response = {
          clientDataJSON: clientDataJSON.buffer,
          attestationObject,
          getTransports() {
            return ['internal'];
          }
        };
        Object.setPrototypeOf(response, AuthenticatorAttestationResponse.prototype);

        port.dispatchEvent(new CustomEvent('copy-data', {
          detail: {
            CREDENTIAL_ID: credIdB64,
            RELYING_PARTY: rp.id,
            USER_HANDLE: base64.encode(user.id.buffer || user.id),
            USERNAME: user.name || 'NA'
          }
        }));

        const publicKeyCredential = createPublicKeyCredential(options.publicKey, response, credIdB64, credId);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return publicKeyCredential;
      };

      /* overrides */
      const msg = (features['backed-up'] ? 'with' : 'without') + ' "backed up" flag';
      console.info('Intercepting Passkey Generation', msg);

      navigator.credentials.create = new Proxy(navigator.credentials.create, {
        apply(target, self, args) {
          const [options] = args;
          if (!options.publicKey) {
            return null;
          }
          return create(args[0]).catch(e => console.error(e));
        }
      });
    },
    args: [Array.from(new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey))), features]
  });
};
