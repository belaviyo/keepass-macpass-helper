/* global search */

{
  const keys = {};
  chrome.storage.local.get({
    keys: {
      'copy': {
        code: 'KeyC',
        meta: ['meta']
      },
      'otp': {
        code: 'KeyO',
        meta: ['meta']
      },
      'password': {
        code: 'KeyX',
        meta: ['meta']
      },
      'insert-both': {
        code: 'KeyB',
        meta: ['meta', 'shift']
      },
      'insert-both-no-submit': {
        code: 'KeyB',
        meta: ['meta']
      },
      'insert-login': {
        code: 'KeyU',
        meta: ['meta']
      },
      'insert-password': {
        code: 'KeyP',
        meta: ['meta']
      },
      'search': {
        code: 'KeyF',
        meta: ['meta']
      },
      'ssdb': {
        code: 'KeyD',
        meta: ['meta']
      },
      'passkey': {
        code: 'KeyK',
        meta: ['meta']
      }
    }
  }).then(prefs => {
    Object.assign(keys, prefs.keys);
    for (const e of document.querySelectorAll('[title]')) {
      if (e.title.includes('{{shortcut-')) {
        e.title = e.title.replace(/{{shortcut-([a-zA-Z0-9_-]+)}}/g, (match, key) => {
          const o = keys[key];
          const m = [];
          if (o.meta.includes('meta')) {
            m.push('Meta');
          }
          if (o.meta.includes('shift')) {
            m.push('Shift');
          }
          return m.join(' + ') + ' + ' + o.code.slice(-1);
        });
      }
    }
  });

  const commands = {
    'copy': () => {
      document.querySelector('[data-cmd="copy"]').click();
    },
    'otp': () => {
      document.querySelector('[data-cmd="otp"]').click();
    },
    'password': () => {
      document.querySelector('[data-cmd="copy"]').dispatchEvent(
        new CustomEvent('click', {
          'detail': 'password',
          'bubbles': true
        })
      );
    },
    'insert-both': () => {
      document.querySelector('[data-cmd="insert-both"]').click();
    },
    'insert-both-no-submit': () => {
      document.querySelector('[data-cmd="insert-both"]').dispatchEvent(
        new CustomEvent('click', {
          'detail': 'no-submit',
          'bubbles': true
        })
      );
    },
    'insert-login': () => {
      document.querySelector('[data-cmd="insert-login"]').click();
    },
    'insert-password': () => {
      document.querySelector('[data-cmd="insert-password"]').click();
    },
    'search': () => {
      search.focus();
      search.select();
    },
    'ssdb': () => {
      document.getElementById('ssdb').click();
    }
  };

  document.addEventListener('keydown', e => {
    for (const [name, func] of Object.entries(commands)) {
      if (e.code !== keys[name].code) {
        continue;
      }
      if (e.shiftKey && keys[name].meta.includes('shift') === false) {
        continue;
      }
      if (e.shiftKey === false && keys[name].meta.includes('shift')) {
        continue;
      }
      if ((e.metaKey || e.altKey || e.ctrlKey) && keys[name].meta.includes('meta') === false) {
        continue;
      }
      if ((e.metaKey || e.altKey || e.ctrlKey) === false && keys[name].meta.includes('meta')) {
        continue;
      }

      e.preventDefault();
      func(e);
      break;
    }

    // Fixed Shortcuts
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (e.target.nodeName === 'SIMPLE-LIST-VIEW') {
        e.preventDefault();
        document.querySelector('[data-cmd="insert-both"]').click();
      }
    }
    else if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      document.querySelector('[data-cmd="delete"]').click();
    }
  });
}
