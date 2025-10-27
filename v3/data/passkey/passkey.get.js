/* global PublicKeyCredential, AuthenticatorAssertionResponse, cloneInto */

const passkey = {};

passkey.get = async (data, count) => {
  const [tab] = await chrome.tabs.query({
    currentWindow: true,
    active: true
  });
  const target = {
    tabId: tab.id,
    allFrames: true
  };

  // only share the private key inside protect context
  await chrome.scripting.executeScript({
    target,
    func: async key => {
      const pem = {
        import(pem) { // PEM to CryptoKey
          const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '')
            .replace(/\s+/g, '');
          const der = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
          return crypto.subtle.importKey('pkcs8', der, {
            name: 'ECDSA',
            namedCurve: 'P-256'
          }, false, ['sign']);
        }
      };
      const privateKey = await pem.import(key);
      const port = document.createElement('span');
      port.id = 'kph-hjUido';
      document.documentElement.appendChild(port);
      port.addEventListener('calculating-signature', async e => {
        e.preventDefault();
        e.stopImmediatePropagation();

        let detail;
        try {
          const {clientDataJSON, authenticatorData} = e.detail;

          const rawSignatureToDER = rawSig => {
            const r = new Uint8Array(rawSig, 0, 32);
            const s = new Uint8Array(rawSig, 32, 32);

            function encodePositiveInteger(intBytes) {
              const padded = (intBytes[0] & 0x80) ? new Uint8Array([0x00, ...intBytes]) : intBytes.slice();
              const len = padded.length;
              const lenBytes = new Uint8Array([len]); // since len <= 33 < 128
              return new Uint8Array([0x02, ...lenBytes, ...padded]);
            }

            const rEncoded = encodePositiveInteger(r);
            const sEncoded = encodePositiveInteger(s);

            const innerLength = rEncoded.length + sEncoded.length;
            const lenBytes = new Uint8Array([innerLength]); // < 128
            const der = new Uint8Array([0x30, ...lenBytes, ...rEncoded, ...sEncoded]);

            return der.buffer;
          };

          // Prepare signed data: authenticatorData || clientDataHash
          const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataJSON);
          const signedData = new Uint8Array(authenticatorData.byteLength + 32);
          signedData.set(new Uint8Array(authenticatorData), 0);
          signedData.set(new Uint8Array(clientDataHash), authenticatorData.byteLength);
          const rawSignature = await crypto.subtle.sign({
            name: 'ECDSA',
            hash: 'SHA-256'
          }, privateKey, signedData);
          detail = {
            signature: rawSignatureToDER(rawSignature)
          };
        }
        catch (e) {
          console.error(e);
          detail = {
            error: e.message
          };
        }
        // Firefox
        if (typeof cloneInto !== 'undefined') {
          detail = cloneInto(detail, window);
        }
        port.dispatchEvent(new CustomEvent('signature-ready', {
          detail
        }));
      });
    },
    args: [data.PRIVATE_KEY_PEM]
  });
  delete data.PRIVATE_KEY_PEM;

  await chrome.scripting.executeScript({
    target,
    world: 'MAIN',
    func: (data, count = 1) => {
      console.info('[login counter]', count, data.CREDENTIAL_ID);

      const port = document.getElementById('kph-hjUido');
      port.remove();
      port.addEventListener('signature-ready', e => {
        if (e.detail.error) {
          port.reject(Error(e.detail.error));
        }
        else {
          port.resolve(e.detail.signature);
        }
      });

      const base64 = {
        decode(url) { // base64url decode
          const base64 = url.replace(/-/g, '+').replace(/_/g, '/');
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          return bytes.buffer;
        },
        encode(buffer) { // base64url encode
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
      };

      const buildAuthenticatorData = async rpId => {
        const rpIdHash = new Uint8Array(await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(rpId)
        )); // 32 bytes

        const flagsValue = 0x05; // UP (user present) + UV
        const flags = new Uint8Array([flagsValue]);
        const signCount = new Uint8Array(4); // login counter (increment on each request)
        (new DataView(signCount.buffer)).setUint32(0, count, false);

        // concatenate rpIdHash + flags + signCount
        const buffer = new Uint8Array(rpIdHash.length + flags.length + signCount.length);
        buffer.set(rpIdHash, 0);
        buffer.set(flags, rpIdHash.length);
        buffer.set(signCount, rpIdHash.length + flags.length);

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

      const get = async options => {
        // Build clientDataJSON
        const clientDataJSON = new TextEncoder().encode(JSON.stringify({
          challenge: base64.encode(options.publicKey.challenge.buffer || options.publicKey.challenge),
          crossOrigin: false,
          origin: location.origin,
          type: 'webauthn.get'
        }));

        const authenticatorData = await buildAuthenticatorData(data.RELYING_PARTY);

        const signature = await new Promise((resolve, reject) => {
          port.resolve = resolve;
          port.reject = reject;

          port.dispatchEvent(new CustomEvent('calculating-signature', {
            detail: {
              clientDataJSON,
              authenticatorData
            }
          }));
        });

        const response = {
          clientDataJSON: clientDataJSON.buffer,
          authenticatorData,
          signature,
          userHandle: base64.decode(data.USER_HANDLE)
        };
        Object.setPrototypeOf(response, AuthenticatorAssertionResponse.prototype);

        const publicKeyCredential = createPublicKeyCredential(
          options.publicKey, response,
          data.CREDENTIAL_ID, base64.decode(data.CREDENTIAL_ID)
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
        return publicKeyCredential;
      };

      /* overrides */
      console.info('Intercepting Passkey Request');

      navigator.credentials.get = new Proxy(navigator.credentials.get, {
        apply(target, self, args) {
          const [options] = args;
          if (!options?.publicKey || options?.mediation === 'silent') {
            return null;
          }
          if (options?.mediation === 'conditional') {
            return Reflect.apply(target, self, args);
          }
          return get(options);
        }
      });
    },
    args: [data, count]
  });
};
