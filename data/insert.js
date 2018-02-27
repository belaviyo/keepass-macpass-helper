/* globals key, cmd, aElement, doSubmit */
'use strict';

chrome.runtime.sendMessage({
  cmd: 'vars',
  id: key
}, ({username, password, stringFields = []}) => {
  function onChange(e) {
    e.dispatchEvent(new Event('change', {bubbles: true}));
    e.dispatchEvent(new Event('input', {bubbles: true}));
  }
  const isHidden = el => el.offsetParent === null;

  const once = aElement => {
    (function(success) {
      if (!success) {
        try {
          aElement.value = cmd === 'insert-password' ? password : username;
        }
        catch (e) {}
      }
      onChange(aElement);
      if (cmd === 'insert-both') {
        const form = aElement.closest('form');
        if (form) {
          // do we have otp or sotp
          const otp = stringFields.filter(o => o.Key === 'otp' || o.Key === 'otp-key')
            .map(o => o.Value).shift();
          const sotp = stringFields.filter(o => o.Key === 'sotp' || o.Key === 'sotp-key')
            .map(o => o.Value).shift();
          // string fields
          const fillStringField = o => {
            const custom = form.querySelector('[id="' + o.Key + '"]') || form.querySelector('[name="' + o.Key + '"]');
            if (custom) {
              const next = value => {
                custom.focus();
                document.execCommand('selectAll', false, '');
                const v = document.execCommand('insertText', false, value);
                if (!v) {
                  try {
                    custom.value = o.Value;
                  }
                  catch (e) {}
                }
                onChange(custom);
              };

              if (o.Value.indexOf('{TOTP}') === -1) {
                next(o.Value);
                Promise.resolve();
              }
              else {
                return new Promise((resolve, reject) => {
                  chrome.runtime.sendMessage({
                    cmd: 'insert.js-otp',
                    sotp,
                    otp
                  }, secret => {
                    if (secret) {
                      next(o.Value.replace('{TOTP}', secret));
                      resolve();
                    }
                    else {
                      next('OTP generation failed');
                      reject('Cannot generate OTP');
                    }
                  });
                });
              }
            }
            else {
              return Promise.resolve();
            }
          };

          Promise.all(stringFields.map(fillStringField)).then(() => {
            // password
            const passElements = [...form.querySelectorAll('[type=password]')].filter(a => isHidden(a) === false);
            passElements.forEach(passElement => {
              passElement.focus();
              let v = false;
              // only insert if password element is focused
              if (document.activeElement === passElement) {
                document.execCommand('selectAll', false, '');
                v = document.execCommand('insertText', false, password);
              }
              if (!v) {
                try {
                  passElement.value = password;
                }
                catch (e) {}
              }
              onChange(passElement);
            });
            // submit
            if (doSubmit) {
              const button = form.querySelector('input[type=submit]') ||
                form.querySelector('button:not([type=reset i]):not([type=button i])');
              if (button) {
                button.click();
              }
              else {
                const onsubmit = form.getAttribute('onsubmit');
                if (onsubmit && onsubmit.indexOf('return false') === -1) {
                  form.onsubmit();
                }
                else {
                  form.submit();
                }
              }
            }
            window.focus();
          }).catch(e => console.error(e));
        }
      }
      else {
        aElement.focus();
        window.focus();
      }
    })(
      document.execCommand('selectAll', false, '') &&
      document.execCommand(
        'insertText',
        false,
        cmd === 'insert-password' ? password : username
      )
    );
  };
  if (aElement) {
    if (Array.isArray(aElement)) {
      aElement.forEach(e => {
        e.focus();
        once(e);
      });
    }
    else {
      once(aElement);
    }
  }
});
