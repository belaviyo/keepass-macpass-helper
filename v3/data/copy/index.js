const args = new URLSearchParams(location.search);

const copy = e => navigator.clipboard.writeText(args.get('content')).then(() => {
  setTimeout(() => chrome.runtime.sendMessage({
    cmd: 'notify',
    message: 'Done',
    badge: '✓',
    color: 'green'
  }, () => window.close()), e && e.isTrusted ? 0 : 1000);
}).catch(e => e.isTrusted ? alert(e.message) : '');

copy();
document.getElementById('copy').addEventListener('click', copy);
