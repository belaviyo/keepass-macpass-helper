'use strict';

var list = document.getElementById('list');
var search = document.querySelector('input[type=search]');

var {url, usernames} = document.location.search.split('?')[1].split('&').map(s => s.split('=')).reduce((p, c) => {
  c[1] = decodeURIComponent(c[1]);
  if (c[0] === 'usernames') {
    c[1] = JSON.parse(c[1]);
  }
  p[c[0]] = c[1];
  return p;
}, {});

search.value = url;

function add (login, password) {
  let entry = document.getElementById('entry');
  entry = document.importNode(entry.content, true);
  entry.querySelector('span').textContent = login;
  entry.querySelector('label').dataset.password = password;
  entry.querySelector('label').dataset.login = login;
  if (usernames.indexOf(login) !== -1) {
    entry.querySelector('input').checked = true;
    console.error('ok', login);
  }
  list.appendChild(entry);
}

function submit () {
  let query = search.value || url;
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
      return add(error);
    }
    response.Entries = response.Entries || [];
    response.Entries.forEach((e) => add(e.Login, e.Password));
    if (response.Success === 'false') {
      return add('Something went wrong!');
    }
    if (response.Entries.length === 0) {
      add('No match!');
    }
    else {
      // if no username is detected, select the first one
      let checked = document.querySelector('#list input:checked');
      if (checked) {
        checked.parentNode.scrollIntoViewIfNeeded();
      }
      else {
        checked = document.querySelector('input[type=radio]');
        checked.click();
      }
      checked.dispatchEvent(new Event('change', {
        bubbles: true
      }));
      search.focus();
    }
  });
}
submit();
document.addEventListener('search', submit);

document.addEventListener('change', e => {
  let target = e.target;
  if (target.type === 'radio') {
    let disabled = !target.parentNode.dataset.password;
    [...document.getElementById('toolbar').querySelectorAll('input')].forEach(input => {
      if (input.dataset.cmd !== 'close') {
        input.disabled = disabled;
      }
    });
  }
});

document.addEventListener('keydown', e => {
  console.error(e.metaKey && e.code , e)
  if (e.code === 'Escape') {
    document.querySelector('[data-cmd="close"]').click();
  }
  else if (e.metaKey && e.code === 'KeyB') {
    if (e.shiftKey) {
      document.querySelector('[data-cmd="insert-both"]').dispatchEvent(
        new CustomEvent('click', {
          'detail': 'no-submit',
          'bubbles': true
        })
      );
    }
    else {
      document.querySelector('[data-cmd="insert-both"]').click();
    }
  }
  else if (e.metaKey && e.code === 'KeyU') {
    document.querySelector('[data-cmd="insert-login"]').click();
  }
  else if (e.metaKey && e.code === 'KeyP') {
    document.querySelector('[data-cmd="insert-password"]').click();
  }
  else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    let checked = document.querySelector('#list input:checked');
    if (checked) {
      let next = checked.parentNode[e.code === 'ArrowDown' ? 'nextElementSibling' : 'previousElementSibling'];
      if (next) {
        next.click();
        next.scrollIntoViewIfNeeded();
      }
    }
  }
  if (e.code === 'Escape' || e.code === 'ArrowDown' || e.code === 'ArrowUp' || (
    e.metaKey && (
      e.code === 'KeyB' || e.code === 'KeyU' || e.code === 'KeyP'
    )
  )) {
    e.preventDefault();
  }
});

document.addEventListener('click', e => {
  let target = e.target;
  let cmd = target.dataset.cmd;
  if (cmd && cmd.startsWith('insert-')) {
    let checked = document.querySelector('#list input:checked').parentNode;
    chrome.runtime.sendMessage({
      cmd,
      detail: e.detail,
      login: checked.dataset.login,
      password: checked.dataset.password
    });
  }
  else if (cmd === 'close') {
    chrome.runtime.sendMessage({cmd: 'close-me'});
  }
});
