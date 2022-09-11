/**
    "list-view" custom component
    Copyright (C) 2022 [Lunu Bounir]

    This program is free software: you can redistribute it and/or modify
    it under the terms of the Mozilla Public License as published by
    the Mozilla Foundation, either version 2 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    Mozilla Public License for more details.
    You should have received a copy of the Mozilla Public License
    along with this program.  If not, see {https://www.mozilla.org/en-US/MPL/}.

    GitHub: https://github.com/lunu-bounir/list-view
    Homepage: https://webextension.org/custom-component/list-view/index.html
*/

class SimpleListView extends HTMLElement {
  #header;
  #parent;
  #select;

  static version = '0.1.4';

  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --height: 32px;
          --gap: 5px;
          --color: #000;
          --selected-bg: #8de7ff;
          --selected-inactive-bg: #94b8c1;

          display: flex;
        }
        #parent {
          --structure: 1fr;

          width: 100%;
          position: relative;
          overflow: auto;
        }
        #parent > div {
          display: grid;
          grid-gap: 0 var(--gap);
          grid-template-columns: var(--structure);
        }
        ::slotted(*),
        #parent > div > * {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        ::slotted(*),
        #parent > div > * {
          height: var(--height);
          line-height: var(--height);
        }
        #parent > div,
        #parent > div > * {
          pointer-events: none;
          z-index: 1;
        }
        ::slotted(*) {
          z-index: 2;
          overflow: hidden;
        }
        #header > [width="0"],
        ::slotted([width="0"]) {
          display: none;
        }
        select {
          position: absolute;
          border: none;
          outline: none;
          width: 100%;
          height: fit-content;
          padding: 0;
          background-color: transparent;
        }
        option {
          box-sizing: border-box;
          background-color: transparent;
          text-indent: 200vw;
          border-radius: 0;
          height: var(--height);
        }
        select[multiple]:focus option:checked {
          background: var(--selected-bg) linear-gradient(0deg, var(--selected-bg) 0%, var(--selected-bg) 500%);
        }
        select[multiple] option:checked {
          background: var(--selected-inactive-bg);
        }
        :host([headers=false]) option:first-of-type,
        :host([headers=false]) #header {
          display: none;
        }
      </style>
      <style id="extra"></style>
      <div id="parent">
        <select multiple id="select" tabindex="1">
          <option disabled part=header>header</option>
        </select>
        <div id="header">
          <slot></slot>
        </div>
      </div>
    `;
    this.#header = this.shadowRoot.getElementById('header');
    this.#parent = this.shadowRoot.getElementById('parent');
    this.#select = this.shadowRoot.getElementById('select');
  }
  #slots(method = 'both') { // native, user, both
    const es = [];
    if (method === 'both' || method === 'native') {
      es.push(...this.#header.querySelectorAll('#header > :not(slot)'));
    }
    if (method === 'both' || method === 'user') {
      es.push(...this.#header.querySelector('slot').assignedElements());
    }

    return es;
  }
  #emit(e, name) {
    e.dispatchEvent(new Event(name, {
      bubbles: true
    }));
  }
  #watch(e) {
    const observer = new MutationObserver(() => this.#resize());
    observer.observe(e, {attributes: true, childList: true, attributeFilter: ['width']});
  }
  #scrollIntoViewIfNeeded() {
    const e = this.#select.options[this.#select.selectedIndex];
    if (e) {
      // e.scrollIntoViewIfNeeded(false);
      if (this.#select.options[1] && this.#select.options[1].selected) {
        this.#parent.scrollTop = 0;
      }
      else if (e.offsetTop < this.#parent.scrollTop) {
        e.scrollIntoView(true);
      }
      else if (e.offsetTop + e.offsetHeight > this.#parent.scrollTop + this.#parent.offsetHeight) {
        e.scrollIntoView(false);
      }
    }
  }
  #resize() {
    const ns = [];
    const c = this.#slots('both').map((e, n) => {
      const w = e.getAttribute('width');
      if (w === '0') {
        ns.push(n);
        return '';
      }
      return w || '1fr';
    }).join(' ');
    this.shadowRoot.getElementById('extra').textContent = ns
      .map(n => `#parent > div > span:nth-child(${n + 1}) {display: none}`)
      .join('\n');

    this.#parent.style.setProperty('--structure', c);
  }
  #adjust() {
    this.#select.size = this.#select.options.length + (this.getAttribute('headers') === 'false' ? -1 : 0);
    this.setAttribute('size', this.#select.size);
  }
  add(parts, name, value, selected = false) {
    const div = document.createElement('div');
    this.#slots('native').forEach(e => {
      const ne = e.cloneNode(true);
      div.append(ne);
    });
    this.#slots('user').forEach((e, n) => {
      const ne = document.createElement('span');
      const part = parts[n] || {};
      ne.textContent = part.name;

      if (part.part) {
        ne.setAttribute('part', part.part);
      }
      div.append(ne);
    });
    this.#parent.append(div);

    const option = document.createElement('option');
    option.textContent = name || '';
    option.value = value;
    option.selected = selected;
    this.#select.append(option);
    this.#adjust();

    if (option.selected) {
      this.#emit(option, 'change');
    }

    option.parts = div.parts = parts;
    option.div = div;
    div.option = option;

    return {div, option};
  }
  removeIndex(index) {
    const option = this.#select.options[index];
    if (option) {
      option.div.remove();
      option.remove();
      this.#adjust();
    }
  }
  clear() {
    while (this.#select.options.length > 1) {
      this.removeIndex(1);
    }
  }
  connectedCallback() {
    this.#resize();
    // make sure selected option is visible
    this.#select.addEventListener('change', () => {
      this.#scrollIntoViewIfNeeded();

      this.#emit(this, 'change');
    });
    // resize
    this.#slots('both').forEach(e => this.#watch(e));
  }
  focus() {
    this.#select.focus();
  }
  get value() {
    return this.#select.value;
  }
  set value(v) {
    this.#select.value = v;
    this.#emit(this.#select, 'change');
  }
  get selectedIndex() {
    return this.#select.selectedIndex;
  }
  set selectedIndex(n) {
    this.#select.selectedIndex = n;
    this.#emit(this.#select, 'change');
  }
  get selectedValues() {
    return [...this.#select.selectedOptions].map(o => o.parts);
  }
  static get observedAttributes() {
    return ['headers', 'width'];
  }
  attributeChangedCallback(name) {
    if (name === 'headers') {
      this.#adjust();
    }
  }
}
customElements.define('simple-list-view', SimpleListView);

class DragListView extends SimpleListView {
  constructor(...args) {
    super(...args);

    const style = document.createElement('style');
    style.textContent = `
      :host {
        --drag-start-bg: #94b8c1;
        --drop-over-bg: #6a858b;
        --drop-over-width: 2px;
      }
      #parent > div:not(#header) > span[part=drag] {
        z-index: 2;
        pointer-events: initial;
        border-left: solid var(--drop-over-width) transparent;
        background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cline stroke-width='16' x1='40' x2='216' y1='128' y2='128' stroke='%23000'/%3E%3Cline stroke-width='16' x1='40' x2='216' y1='64' y2='64' stroke='%23000'/%3E%3Cline stroke-width='16' x1='40' x2='216' y1='192' y2='192' stroke='%23000'/%3E%3C/svg%3E") center center no-repeat;
        background-size: 16px;
        cursor: ns-resize;
      }
      #parent > div:not(#header).start > span[part=drag] {
        border-left-color: var(--drag-start-bg);
      }
      #parent > div:not(#header) > span[part=drag].over {
        border-left-color: var(--drop-over-bg);
      }
      #parent > div::after {
        position: absolute;
        right: 0;
        content: attr(data-count);
        pointer-events: none;
        padding: 5px;
      }
    `;
    this.shadowRoot.append(style);

    this.shadowRoot.getElementById('header').insertAdjacentHTML(
      'afterBegin',
      `<span width="20px" part="drag"></span>`
    );

    this.shadowRoot.addEventListener('dragstart', e => this.#dragstart(e));
    this.shadowRoot.addEventListener('dragend', e => this.#dragend(e));
    this.shadowRoot.addEventListener('dragenter', e => this.#dragenter(e));
    this.shadowRoot.addEventListener('dragleave', e => this.#dragleave(e));
    this.shadowRoot.addEventListener('dragover', e => this.#dragover(e));
    this.shadowRoot.addEventListener('drop', e => this.#drop(e));
  }
  #dragstart(e) {
    e.dataTransfer.setData('text/x-list-view-drag', 'entry');
    e.dataTransfer.effectAllowed = 'move';

    // count
    const div = e.target;
    const select = this.shadowRoot.getElementById('select');
    const lazy = divs => setTimeout(() => {
      divs.forEach(d => d.classList.add('start'));
    });
    if (div.option.selected) {
      const count = select.selectedOptions.length;
      if (count > 1) {
        div.dataset.count = '×' + count;
        setTimeout(() => div.dataset.count = '');
      }
      lazy([...select.selectedOptions].map(o => o.div));
    }
    else {
      lazy([div]);
    }
  }
  #dragend() {
    for (const e of this.shadowRoot.querySelectorAll('div.start')) {
      e.classList.remove('start');
    }
    for (const e of this.shadowRoot.querySelectorAll('span.over')) {
      e.classList.remove('over');
    }
  }
  #dragenter(e) {
    if (e.dataTransfer.types.includes('text/x-list-view-drag')) {
      if (e.target.getAttribute('part') === 'drag') {
        e.target.classList.add('over');
      }
    }
  }
  #dragleave(e) {
    e.target.classList.remove('over');
  }
  #dragover(e) {
    if (e.target.classList.contains('over')) {
      e.preventDefault();
    }
  }
  #drop(e) {
    const over = this.shadowRoot.querySelector('span.over');
    const dragged = this.shadowRoot.querySelectorAll('div.start');

    if (over && dragged.length) {
      e.preventDefault();

      const dest = over.parentElement;
      dest.before(...dragged);
      dest.option.before(...[...dragged].map(d => d.option));
    }
  }
  add(...args) {
    const r = super.add(...args);
    if (this.getAttribute('drag') !== 'false') {
      r.div.setAttribute('draggable', true);
    }
    return r;
  }
  static get observedAttributes() {
    return ['drag', ...super.observedAttributes];
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'drag') {
      const e = this.shadowRoot.querySelector('#header span[part=drag]');
      e.setAttribute('width', newValue === 'true' ? '20px' : '0');
    }
    else {
      super.attributeChangedCallback(name, oldValue, newValue);
    }
  }
}
customElements.define('list-view', DragListView);
