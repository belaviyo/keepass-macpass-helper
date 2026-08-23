let dialog;
let label;
let input;

const once = () => {
  if (once.done) {
    return;
  }
  once.done = true;

  dialog = document.createElement('dialog');
  dialog.style = `
    padding: 10px;
    min-width: 280px;
    max-width: 90vw;
    border: solid 1px var(--bd-alt, #333);
    border-radius: 5px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  const form = document.createElement('form');
  form.method = 'dialog';
  form.style = `
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;

  label = document.createElement('label');
  label.id = 'prompt-label';
  label.style = `
    font-weight: bold;
    font-size: 13px;
  `;

  input = document.createElement('input');
  input.type = 'text';
  input.name = 'value';
  input.style = `
    padding: 5px;
    font-size: 14px;
  `;

  const buttons = document.createElement('div');
  buttons.style = `
    display: flex;
    justify-content: end;
    flex-direction: row-reverse;
    gap: 5px;
  `;

  const cancel = document.createElement('input');
  cancel.type = 'submit';
  cancel.value = 'Cancel';
  cancel.name = 'cancel';

  const ok = document.createElement('input');
  ok.type = 'submit';
  ok.value = 'OK';
  ok.name = 'ok';

  buttons.append(ok, cancel);
  form.append(label, input, buttons);
  dialog.append(form);
  document.body.append(dialog);

  form.addEventListener('submit', e => {
    e.preventDefault();
    dialog.close(e.submitter.name === 'ok' ? 'ok' : 'cancel');
  });
};

const prompt = (message, defaultValue, options) => {
  once();
  label.textContent = message || '';
  input.value = defaultValue || '';
  input.type = options?.password ? 'password' : 'text';
  dialog.showModal();
  input.focus();
  input.select();
  return new Promise(resolve => {
    dialog.onclose = () => resolve(dialog.returnValue === 'ok' ? input.value : null);
  });
};

export {prompt};
