// Extend the Element prototype with a new method
Document.prototype.extendedQuerySelectorAll = Element.prototype.extendedQuerySelectorAll = function(q) {
  const found = [];

  const traverse = node => {
    // Add elements matching the query to the found array
    found.push(...node.querySelectorAll(q));

    // Traverse all elements in the current node
    for (const e of node.querySelectorAll('*')) {
      // If the element has a shadow root, traverse it as well
      if (e.shadowRoot) {
        try {
          traverse(e.shadowRoot);
        }
        catch (e) {}
      }
    }
  };
  traverse(this);
  return found;
};

// detect the parent form element from a query
self.detectForm = function(e, query = '[type=password]') {
  const form = e.closest('form');

  if (form) {
    return form;
  }
  // what if there is no form element
  let parent = e;
  for (let i = 0; i < 10; i += 1) {
    if (parent.parentElement) {
      parent = parent.parentElement;
    }
    else {
      if (parent.getRootNode() instanceof ShadowRoot) {
        parent = parent.getRootNode().host;
      }
    }

    if (parent.extendedQuerySelectorAll(query).length) {
      return parent;
    }
  }
  return parent;
};
