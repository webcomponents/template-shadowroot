/**
 * @license
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {hydrateShadowRoots} from '../template-attach-shadow.js';

const assert = chai.assert;

const elementLog: Array<string|null> = [];

class TestLogElement extends HTMLElement {
  constructor() {
    super();
    const label = this.getAttribute('label');
    elementLog.push(label);
  }
}
customElements.define('test-log', TestLogElement);

// When we serialize
function assertSerializesAs(
    actual: Element, expectedSerialization: string, message?: string) {
  let actualSerialization = getSerializableTree(actual).innerHTML;
  actualSerialization = actualSerialization.replace(/\n\s+/g, '');
  expectedSerialization = expectedSerialization.replace(/\n\s+/g, '');
  assert.deepEqual(actualSerialization, expectedSerialization, message);
}

suite('hydrateShadowRoots', () => {
  teardown(() => {
    elementLog.length = 0;
  });

  test('hydrates a template', () => {
    const root = document.createElement('div');
    const serialized = `
      <test-log label="A">
        <template shadowroot="open">
          <h1>Hello</h1>
          <test-log label="B"></test-log>
        </template>
      </test-log>
    `;
    root.innerHTML = serialized;
    document.body.append(root);
    assert.deepEqual(elementLog, ['A']);
    hydrateShadowRoots(root);
    assert.deepEqual(elementLog, ['A', 'B']);
    assertSerializesAs(root, serialized);
  });

  test('hydrates nested templates in postorder', () => {
    const root = document.createElement('div');
    const serialized = `
      <test-log label="A">
        <template shadowroot="open">
          <h1>Hello</h1>
          <test-log label="B">
            <template shadowroot="open">
              <h1>World!</h1>
              <test-log label="C"></test-log>
            </template>
          </test-log>
          <test-log label="D"></test-log>
        </template>
      </test-log>
    `;
    root.innerHTML = serialized;
    // Only needed if we don't explicitly call customElements.upgrade()
    document.body.append(root);
    assert.deepEqual(elementLog, ['A']);
    hydrateShadowRoots(root);
    // If the templates hydrated in document order, D would upgrade before C
    assert.deepEqual(elementLog, ['A', 'B', 'C', 'D']);
    assertSerializesAs(root, serialized);
  });

  // TODO(justinfagnani): more tests...
  //  * Multiple <template shadowRoot> on one host should error
  //  * <template> w/o shadowRoot should not be traversed into
  //  * shadowroot="closed"
  //  * shadowroot= something invalid
});

function isTemplate(e: Node): e is HTMLTemplateElement {
  return (e as Partial<Element>).tagName === 'TEMPLATE';
}
function isElement(e: Node): e is HTMLElement {
  return e.nodeType === Node.ELEMENT_NODE;
}
function isDocumentFragment(e: Node): e is DocumentFragment {
  return e.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

/**
 * A somewhat hacky implementation of
 *    element.getInnerHTML({ includeShadowRoots: true })
 * from
 * https://github.com/mfreed7/declarative-shadow-dom/blob/7fa1adec34dd997c2c04d4a8ed82f693fa3441ed/README.md#serialization
 *
 * Not super robust, but good enough for testing.
 */
function getSerializableTree<T extends Node>(node: T): T {
  const children = (node as Partial<Element>).childNodes;
  if (children === undefined || node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true) as T;
  }
  let clone;
  if (isDocumentFragment(node)) {
    clone = document.createDocumentFragment()
  } else {
    if (!isElement(node)) {
      throw new Error(`Expected ${node} to be an element`);
    }
    clone = document.createElement(node.tagName);
    const attributes = node.attributes;
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes.item(i)!;
      clone.setAttribute(attr.name, attr.value);
    }
    if (node.shadowRoot !== null) {
      const shadowTemplate = document.createElement('template');
      shadowTemplate.setAttribute('shadowroot', 'open');
      copyTemplateContents(node.shadowRoot, shadowTemplate.content);
      clone.appendChild(shadowTemplate);
    }
  }
  for (let i = 0; i < children.length; i++) {
    clone.appendChild(getSerializableTree(children[i]));
  }
  if (isTemplate(node)) {
    copyTemplateContents(node.content, (clone as HTMLTemplateElement).content);
  }
  return clone as unknown as T;
}

function copyTemplateContents(
    from: DocumentFragment|ShadowRoot, to: DocumentFragment) {
  const contentChildren = from.childNodes;
  for (let i = 0; i < contentChildren.length; i++) {
    to.appendChild(getSerializableTree(contentChildren[i]));
  }
}
