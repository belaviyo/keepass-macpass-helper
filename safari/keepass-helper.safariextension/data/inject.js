/* globals safari */
'use strict';

function isEditable (el) {
  let node = el.nodeName.toLowerCase();
  if (el.nodeType === 1 && (node === 'textarea' ||
    (node === 'input' && /^(?:text|email|number|search|tel|url|password)$/i.test(el.type)))) {
    return true;
  }
  return el.isContentEditable;
}

safari.self.addEventListener('message', (e) => {
  let cmd = e.message.cmd;
  let aElement;
  if (e.name === 'command') {
    aElement = document.activeElement; //jshint ignore:line
    aElement = isEditable(aElement) ? aElement : null;
  }

  if (e.name === 'command' && cmd.startsWith('insert-')) {
    if (aElement) {
      (function (success) {
        if (!success) {
          try {
            aElement.value = cmd === 'insert-password' ? e.message.password : e.message.login;
          } catch (e) {}
        }
        if (cmd === 'insert-both') {
          let form = aElement.closest('form');
          if (form) {
            let password = form.querySelector('[type=password]');
            if (password) {
              password.focus();
              document.execCommand('selectAll', false, '');
              let v = document.execCommand('insertText', false, e.message.password);
              if (!v) {
                try {
                  password.value = e.message.password;
                } catch (e) {}
              }
              if (e.message.detail !== 'no-submit') {
                // submit
                let button = form.querySelector('input[type=submit]') || form.querySelector('[type=submit]');
                if (button) {
                  button.click();
                }
                else {
                  let onsubmit = form.getAttribute('onsubmit');
                  if (onsubmit && onsubmit.indexOf('return false') === -1) {
                    form.onsubmit();
                  }
                  else {
                    form.submit();
                  }
                }
              }
              window.focus();
              password.focus();
            }
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
          cmd === 'insert-password' ? e.message.password : e.message.login
        )
      );
    }
  }
  else if (e.name === 'command' && e.message.cmd === 'inspect') {
    // try to find used usernames
    if (aElement) {
      let forms = Array.from(document.querySelectorAll('input[type=password]'))
        .map(p => p.form)
        .filter(f => f)
        .filter((f, i, l) => l.indexOf(f) === i);

      safari.self.tab.dispatchMessage('page', {
        cmd: 'guesses',
        guesses: forms.map(f => [...f.querySelectorAll('input:not([type=password])')]
          .filter(i => (i.type === 'text' || i.type === 'email'))
        )
        .reduce((p, c) => p.concat(c), [])
        .map(e => e && e.value ? e.value : null)
        .filter(n => n)
      });
    }
  }
});
