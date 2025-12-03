/* global notify */

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

  const persist = async id => {
    if (id === tabId) {
      chrome.tabs.onUpdated.removeListener(persist);

      try {
        await chrome.scripting.executeScript({
          target,
          files: ['/data/passkey/passkey.create/isolated.js']
        });
        await chrome.scripting.executeScript({
          target,
          world: 'MAIN',
          files: ['/data/passkey/passkey.create/main.js']
        });
      }
      catch (e) {
        console.error(e);

        notify({
          id
        }, `Passkey generation on this tab failed!
Use the right-click context menu on the action button to activate it for this tab again, or, if you arrived here from a cross-origin page, enable access to cross-origin frames in the Options page and retry.

${e.message}`, '!', '#fa903e');
      }
    }
  };
  passkey.set.args.set(tabId, {
    key: await pem.export(keyPair.privateKey),
    pub: Array.from(new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey))),
    features,
    persist
  });

  await chrome.scripting.executeScript({
    target,
    files: ['/data/passkey/passkey.create/isolated.js']
  });
  await chrome.scripting.executeScript({
    target,
    world: 'MAIN',
    files: ['/data/passkey/passkey.create/main.js']
  });
  // persist for more location change
  // https://github.com/belaviyo/keepass-macpass-helper/issues/84
  chrome.tabs.onUpdated.addListener(persist);
};
passkey.set.args = new Map();
