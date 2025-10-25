const args = new URLSearchParams(location.search);

const copy = content => navigator.clipboard.writeText(content).catch(e => {
  alert(e.message);
});

document.getElementById('data').value = args.get('data');

document.getElementById('save-name').onclick = () => copy(document.getElementById('name').value);
document.getElementById('save-value').onclick = () => copy(document.getElementById('data').value);
