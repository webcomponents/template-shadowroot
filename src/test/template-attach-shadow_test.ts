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

suite('hydrateShadowRoots', () => {
  teardown(() => {
    elementLog.length = 0;
  });

  test('hydrates a template', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <test-log label="A">
        <template shadowroot="open">
          <h1>Hello</h1>
          <test-log label="B"></test-log>
        </template>
      </div>
    `;
    document.body.append(root);
    assert.deepEqual(elementLog, ['A']);
    hydrateShadowRoots(root);
    assert.deepEqual(elementLog, ['A', 'B']);
  });

  test('hydrates nested templates in postorder', () => {
    const root = document.createElement('div');
    root.innerHTML = `
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
      </div>
    `;
    // Only needed if we don't explicitly call customElements.upgrade()
    document.body.append(root);
    assert.deepEqual(elementLog, ['A']);
    hydrateShadowRoots(root);
    // If the templates hydrated in document order, D would upgrade before C
    assert.deepEqual(elementLog, ['A', 'B', 'C', 'D']);
  });

  // TODO(justinfagnani): more tests...
  //  * Multiple <template shadowRoot> on one host should error
  //  * <template> w/o shadowRoot should not be traversed into
  //  * shadowroot="closed"
  //  * shadowroot= something invalid
});
