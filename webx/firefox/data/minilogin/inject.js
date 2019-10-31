'use strict';

const style = document.createElement('style');
style.textContent = `
  .kh-minilogin {
    background: url(${chrome.runtime.getURL('/data/icons/32.png')}) center center no-repeat;
    background-size: 16px 16px;
    width: 16px;
    height: 16px;
    position: absolute;
    z-index: 2147483646;
    cursor: pointer !important;
    opacity: 0.2;
  }
  .kh-minilogin:hover {
    opacity: 1
  }
  body[data-keepasshelper=true] .kh-minilogin {
    display: none;
  }
`;
document.documentElement.appendChild(style);

[...document.querySelectorAll('input[type="password"]')].forEach(e => {
  const span = document.createElement('span');
  span.classList.add('kh-minilogin');

  const pos = () => {
    const box = e.getBoundingClientRect();
    let left = box.left + box.width - 22;
    // do we have a conflicing element at position; e.g. proton mail
    const eps = document.elementsFromPoint(box.left + box.width - 11, box.top + box.height / 2);
    if (eps[0] !== e && eps[1] === e) {
      left -= eps[0].getBoundingClientRect().width;
    }

    span.style = `
      top: ${box.top + box.height / 2 - 9}px;
      left: ${left}px;
    `;
  };
  // if the login box is hidden
  e.addEventListener('focus', pos);
  pos();

  span.onclick = () => {
    e.focus();
    window.inject = true;
    chrome.runtime.sendMessage({
      cmd: 'inject-embedded'
    });
  };
  document.documentElement.appendChild(span);
});
