'use strict';

var list = document.getElementById('list');
var search = document.querySelector('input[type=search]');

var {url} = document.location.search.split('?')[1].split('&').map(s => s.split('='))
.reduce((p, c) => Object.assign(p, {
  [c[0]]: decodeURIComponent(c[1])
}), {});

var cookie = {
  get host() {
    return (new URL(url)).hostname;
  },
  get: () => {
    const key = document.cookie.split(`${cookie.host}=`);
    if (key.length > 1) {
      return key[1].split(';')[0];
    }
  },
  set: value => {
    const days = 60;
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));

    document.cookie = `${cookie.host}=${value}; expires=${date.toGMTString()}`;
  }
};

var usernames = [];

search.value = url;

function add(login, name, password) {
  const entry = Object.assign(document.createElement('option'), {
    textContent: login + (name ? ` - ${name}` : ''),
    value: login
  });
  entry.dataset.password = password || '';
  list.appendChild(entry);
}

function submit() {
  const query = search.value || url;
  search.value = query;
  list.textContent = '';
  [...document.getElementById('toolbar').querySelectorAll('input')].forEach(input => {
    if (input.dataset.cmd !== 'close') {
      input.disabled = true;
    }
  });

  chrome.runtime.sendMessage({
    cmd: 'logins',
    query
  }, ({error, response}) => {
    if (error) {
      add(error);
    }
    else {
      response.Entries = response.Entries || [];
      response.Entries.forEach(e => add(e.Login, e.Name, e.Password));
      if (response.Success === 'false') {
        focus();
        add('Something went wrong!');
      }
      else {
        if (response.Entries.length === 0) {
          add('No match!');
        }
        else {// select an item
          const username = response.Entries.map(e => e.Login).filter(u => usernames.indexOf(u) !== -1).shift() ||
            cookie.get() ||
            response.Entries[0].Login;
          list.value = username;
          list.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        }
      }
    }
    window.focus();
    list.focus();
  });
}

function copy(str) {
  document.oncopy = event => {
    event.clipboardData.setData('text/plain', str);
    event.preventDefault();
  };
  document.execCommand('Copy', false, null);
}

chrome.runtime.onMessage.addListener(request => {
  if (request.cmd === 'guesses') {
    usernames = usernames.concat(request.guesses);
    [...list.querySelectorAll('option')].map(o => o.value)
      .filter(u => request.guesses.indexOf(u) !== -1)
      .forEach(u => list.value = u);
  }
});

submit();
document.addEventListener('search', submit);

document.addEventListener('change', e => {
  const target = e.target;
  if (target.nodeName === 'SELECT') {
    const disabled = target.selectedOptions.length === 0 || !target.selectedOptions[0].dataset.password;
    [...document.getElementById('toolbar').querySelectorAll('input')]
      .filter(input => input.dataset.cmd !== 'close')
      .forEach(input => input.disabled = disabled);
  }
});

document.addEventListener('keydown', e => {
  const metaKey = e.metaKey || e.altKey || e.ctrlKey;
  if (e.code === 'Escape') {
    document.querySelector('[data-cmd="close"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyC') {
    document.querySelector('[data-cmd="copy"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyX') {
    document.querySelector('[data-cmd="copy"]').dispatchEvent(
      new CustomEvent('click', {
        'detail': 'password',
        'bubbles': true
      })
    );
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyB') {
    if (e.shiftKey) {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
    else {
      document.querySelector('[data-cmd="insert-both"]').dispatchEvent(
        new CustomEvent('click', {
          'detail': 'no-submit',
          'bubbles': true
        })
      );
    }
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyU') {
    document.querySelector('[data-cmd="insert-login"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyP') {
    document.querySelector('[data-cmd="insert-password"]').click();
    e.preventDefault();
  }
  else if (metaKey && e.code === 'KeyF') {
    search.focus();
    e.preventDefault();
  }
  else if (e.code === 'Enter') {
    if (e.target.nodeName === 'SELECT') {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
  }
});

document.addEventListener('click', e => {
  const target = e.target;
  const cmd = target.dataset.cmd;
  // cache
  if (cmd && (cmd.startsWith('insert-') || cmd.startsWith('copy'))) {
    cookie.set(list.value);
  }
  //
  if (cmd && cmd.startsWith('insert-')) {
    const checked = list.selectedOptions[0];
    chrome.runtime.sendMessage({
      cmd,
      detail: e.detail,
      login: list.value,
      password: checked.dataset.password
    });
  }
  else if (cmd && cmd.startsWith('copy')) {
    if (e.detail === 'password') {
      const checked = list.selectedOptions[0];
      copy(checked.dataset.password);
    }
    else {
      copy(list.value);
    }
    chrome.runtime.sendMessage({
      cmd: 'notify',
      message: (e.detail === 'password' ? 'Password' : 'Login name') + ' is copied to the clipboard'
    });
  }
  else if (cmd === 'close') {
    chrome.runtime.sendMessage({cmd: 'close-me'});
  }
});

// keep focus
window.addEventListener('blur', () => window.setTimeout(window.focus, 0));
