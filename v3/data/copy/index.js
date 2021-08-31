const args = new URLSearchParams(location.search);

const copy = () => navigator.clipboard.writeText(args.get('content')).then(() => window.close());

copy();
document.getElementById('copy').addEventListener('click', copy);
