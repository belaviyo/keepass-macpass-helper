/* MAIN-world injection: PublicKeyCredential static overrides.
   Self-contained — executed via chrome.scripting.executeScript func */

const passkeySupport = {
  // what the extension fakes
  WANTED: {
    conditionalMediation: false,
    uv: true,
    caps: [
      'passkeyPlatformAuthenticator',
      'userVerifyingPlatformAuthenticator',
      'conditionalCreate',
      'conditionalGet'
    ]
  },

  /* MAIN world: evaluate the browser's CURRENT behavior against WANTED.
     Returns a structured-cloneable "plan" for injects()

     self-contained: WANTED is inlined since injected funcs cannot use closures */
  evaluate: async () => {
    const WANTED_CAPS = [
      'passkeyPlatformAuthenticator',
      'userVerifyingPlatformAuthenticator',
      'conditionalCreate',
      'conditionalGet'
    ];
    if (!window.PublicKeyCredential) {
      return null; // no WebAuthn class at all: nothing to override
    }
    const plan = {uv: false, conditionalMediation: false, caps: null};
    try {
      plan.uv = (await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.()) !== true;
    }
    catch (e) {
      plan.uv = true;
    }
    try {
      plan.conditionalMediation = (await window.PublicKeyCredential.isConditionalMediationAvailable?.()) !== false;
    }
    catch (e) {
      plan.conditionalMediation = true;
    }
    if (typeof window.PublicKeyCredential.getClientCapabilities === 'function') {
      try {
        const capabilities = await window.PublicKeyCredential.getClientCapabilities() ?? {};
        const missing = WANTED_CAPS.filter(key => capabilities[key] !== true);
        plan.caps = missing.length ? missing : null;
      }
      catch (e) {
        plan.caps = [...WANTED_CAPS];
      }
    }
    else {
      plan.caps = [...WANTED_CAPS];
    }
    return plan;
  },

  /* MAIN world: apply ONLY the overrides the plan requests. */
  injects: plan => {
    if (!window.PublicKeyCredential) {
      return;
    }

    if (plan.conditionalMediation) {
      const isConditionalMediationAvailable = async () => false;
      Object.defineProperty(window.PublicKeyCredential, 'isConditionalMediationAvailable', {
        value: isConditionalMediationAvailable
      });
    }
    if (plan.uv) {
      const isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
      Object.defineProperty(window.PublicKeyCredential, 'isUserVerifyingPlatformAuthenticatorAvailable', {
        value: isUserVerifyingPlatformAuthenticatorAvailable
      });
    }
    if (plan.caps?.length) {
      // only the capabilities the browser is not natively answering correctly
      const REQUIRED = plan.caps;
      if (typeof window.PublicKeyCredential.getClientCapabilities === 'function') {
        // capture the ORIGINAL method reference before overriding to avoid recursion
        const native = window.PublicKeyCredential.getClientCapabilities;
        window.PublicKeyCredential.getClientCapabilities = new Proxy(native, {
          async apply(target, self, args) {
            let capabilities;
            try {
              capabilities = await Reflect.apply(target, self, args) ?? {};
            }
            catch (e) {
              // the API exists but might be flag-gated or reject in some browsers
              capabilities = {};
            }
            for (const key of REQUIRED) {
              capabilities[key] = true;
            }
            return capabilities;
          }
        });
      }
      else {
        window.PublicKeyCredential.getClientCapabilities = async () =>
          Object.fromEntries(REQUIRED.map(key => [key, true]));
      }
    }
  }
};
