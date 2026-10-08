/* registered content script (MAIN world, document_start):
   evaluate the browser's CURRENT passkey support and apply ONLY the
   missing PublicKeyCredential overrides. Requires passkey.support.js
   to run first (both files are in the same registerContentScripts entry) */

passkeySupport.evaluate().then(plan => {
  console.log(plan, plan.uv || plan.conditionalMediation || plan.caps);
  if (plan && (plan.uv || plan.conditionalMediation || plan.caps)) {
    passkeySupport.injects(plan);
  }
});
