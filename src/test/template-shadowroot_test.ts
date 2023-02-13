/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {hydrateShadowRoots as manualWalkHydration} from '../_implementation/manual_walk.js';
import {transformShadowRoots} from '../_implementation/mutation_observer';
import {hydrateShadowRoots as querySelectorHydration} from '../_implementation/queryselectorall.js';
import {hasNativeDeclarativeShadowRoots} from '../template-shadowroot.js';

const elementLog: Array<string|null> = [];

// for syntax highlighting
function html(s: TemplateStringsArray) {
  return s.join('');
}

async function waitATickForMutationObserverToRun() {
  return 0;
}

class TestLogElement extends HTMLElement {
  constructor() {
    super();
    const label = this.getAttribute('label');
    elementLog.push(label);
  }
}
customElements.define('test-log', TestLogElement);

// When we serialize
function assertSerializesAs(actual: Element, expectedSerialization: string) {
  let actualSerialization = getSerializableTree(actual).innerHTML;
  actualSerialization = actualSerialization.replace(/\n\s+/g, '');
  expectedSerialization = expectedSerialization.replace(/\n\s+/g, '');
  expect(actualSerialization).toEqual(expectedSerialization);
}
const implementations = [
  ['manual walk ponyfill', manualWalkHydration],
  ['querySelectorAll ponyfill', querySelectorHydration],
  ['mutationObserver', () => {/* see below */}],
] as const;
for (const [name, hydrateShadowRoots] of implementations) {
  describe(name, () => {
    let cleanupFn = () => {};
    const automaticHydration =
        name === 'mutationObserver' || hasNativeDeclarativeShadowRoots();
    beforeEach(() => {
      if (name === 'mutationObserver') {
        let {cleanup} = transformShadowRoots();
        cleanupFn = cleanup;
      }
    });
    afterEach(() => {
      elementLog.length = 0;
      cleanupFn();
    });

    it('hydrates a template with old DSD syntax', async () => {
      const root = document.createElement('div');
      const serialized = html`
        <test-log label="A">
          <template shadowroot="open">
            <h1>Hello</h1>
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).toEqual(['A']);
      }
      hydrateShadowRoots(root);
      expect(elementLog).toEqual(['A', 'B']);
      expect(root.querySelector('test-log')?.shadowRoot)
          .toBeInstanceOf(ShadowRoot);
      assertSerializesAs(root, serialized);
    });

    it('hydrates a template with streaming DSD syntax', async () => {
      const root = document.createElement('div');
      const serialized = html`
        <test-log label="A">
          <template shadowrootmode="open">
            <h1>Hello</h1>
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).toEqual(['A']);
      }
      hydrateShadowRoots(root);
      expect(elementLog).toEqual(['A', 'B']);
      expect(root.querySelector('test-log')?.shadowRoot)
          .toBeInstanceOf(ShadowRoot);
      assertSerializesAs(root, serialized);
    });

    it('hydrates a template with both syntaxes', async () => {
      const root = document.createElement('div');
      const serialized = html`
        <test-log label="A">
          <template shadowroot="open" shadowrootmode="open">
            <h1>Hello</h1>
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).toEqual(['A']);
      }
      hydrateShadowRoots(root);
      expect(elementLog).toEqual(['A', 'B']);
      expect(root.querySelector('test-log')?.shadowRoot)
          .toBeInstanceOf(ShadowRoot);
      assertSerializesAs(root, serialized);
    });

    it('hydrates nested templates in postorder', async () => {
      const root = document.createElement('div');
      const serialized = html`
        <test-log label="A">
          <template shadowrootmode="open">
            <h1>Hello</h1>
            <test-log label="B">
              <template shadowrootmode="open">
                <h1>World!</h1>
                <test-log label="C"></test-log>
              </template>
            </test-log>
            <test-log label="D"></test-log>
          </template>
        </test-log>
      `;
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).toEqual(['A']);
      }
      hydrateShadowRoots(root);
      expect(root.querySelector('test-log')?.shadowRoot)
          .toBeInstanceOf(ShadowRoot);
      // If the templates hydrated in document order, D would upgrade before C
      expect(elementLog).toEqual(['A', 'B', 'C', 'D']);
      assertSerializesAs(root, serialized);
    });

    describe('multiple roots in the same host', () => {
      it('ignores multiple open shadow roots', async () => {
        const root = document.createElement('div');
        root.innerHTML = html`
          <test-log label="A">
            <template shadowrootmode="open">
              <test-log label="B"></test-log>
            </template>
            <template shadowrootmode="open">
              <test-log label="C"></test-log>
            </template>
          </test-log>
        `;
        document.body.append(root);
        await waitATickForMutationObserverToRun();
        // Divergence between native prototype and this polyfill.
        // Is it intentional? Filed as
        // https://github.com/mfreed7/declarative-shadow-dom/issues/4
        if (hasNativeDeclarativeShadowRoots()) {
          expect(elementLog).toEqual(['A', 'C']);
          assertSerializesAs(root, html`
            <test-log label="A">
              <template shadowrootmode="open">
                <test-log label="C"></test-log>
              </template>
            </test-log>
          `);
        } else {
          if (!automaticHydration) {
            expect(elementLog).toEqual(['A']);
          }
          hydrateShadowRoots(root);
          expect(elementLog).toEqual(['A', 'B']);
          assertSerializesAs(root, html`
            <test-log label="A">
              <template shadowrootmode="open">
                <test-log label="B"></test-log>
              </template>
            </test-log>
          `);
        }
        expect(root.querySelector('test-log')?.shadowRoot)
            .toBeInstanceOf(ShadowRoot);
      });

      it('ignores multiple closed shadow roots', async () => {
        const root = document.createElement('div');
        root.innerHTML = html`
          <test-log label="A">
            <template shadowrootmode="closed">
              <test-log label="B"></test-log>
            </template>
            <template shadowrootmode="closed">
              <test-log label="C"></test-log>
            </template>
          </test-log>
        `;
        const serialized = `
          <test-log label="A">
          </test-log>
        `;
        document.body.append(root);
        await waitATickForMutationObserverToRun();
        // Divergence between native prototype and this polyfill.
        // Is it intentional? Filed as
        // https://github.com/mfreed7/declarative-shadow-dom/issues/4
        if (hasNativeDeclarativeShadowRoots()) {
          expect(elementLog).toEqual(['A', 'C']);
        } else {
          if (!automaticHydration) {
            expect(elementLog).toEqual(['A']);
          }
          hydrateShadowRoots(root);
          expect(elementLog).toEqual(['A', 'B']);
        }
        assertSerializesAs(root, serialized);
        // Closed shadow root, so no .shadowRoot field
        expect(root.querySelector('test-log')?.shadowRoot).toEqual(null);
      });
    });

    it('normal templates are not modified', async () => {
      const root = document.createElement('div');
      const serialized = html`
        <test-log label="A">
          <test-log label="B"></test-log>
          <template>
            <test-log label="C"></test-log>
          </template>
          <test-log label="D"></test-log>
        </test-log>
      `;
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      expect(elementLog).toEqual(['A', 'B', 'D']);
      hydrateShadowRoots(root);
      expect(elementLog).toEqual(['A', 'B', 'D']);
      assertSerializesAs(root, serialized);
      expect(root.querySelector('test-log')?.shadowRoot).toEqual(null);
    });

    it('shadow roots are expanded inside regular templates', async () => {
      const serialized = html`
        <test-log label="A">
          <test-log label="B"></test-log>
          <template>
            <test-log label="C">
              <template shadowrootmode="open">
                <div>Inner</div>
              </template>
            </test-log>
          </template>
          <test-log label="D"></test-log>
        </test-log>
      `;
      const root = document.createElement('div');
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      hydrateShadowRoots(root);
      const innerShadowRoot = root.querySelector('template')
                                  ?.content.querySelector('test-log')
                                  ?.shadowRoot;
      expect(innerShadowRoot?.textContent?.trim()).toEqual('Inner');
      assertSerializesAs(root, serialized);
      expect(root.querySelector('test-log')?.shadowRoot).toEqual(null);
      expect(root.querySelector('template')
                 ?.content.querySelector('test-log')
                 ?.shadowRoot)
          .toBeInstanceOf(ShadowRoot);
    });

    it('can make closed shadow roots', async () => {
      const root = document.createElement('div');
      root.innerHTML = html`
        <test-log label="A">
          <template shadowrootmode="closed">
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      // closed shadow root does not get serialized
      const serialized = `
        <test-log label="A">
        </test-log>
      `;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).toEqual(['A']);
      }
      hydrateShadowRoots(root);
      expect(elementLog).toEqual(['A', 'B']);
      assertSerializesAs(root, serialized);
      expect(root.querySelector('test-log')?.shadowRoot).toEqual(null);
    });

    it('ignores shadowrootmode="unknown"', async () => {
      const root = document.createElement('div');
      const serialized = html`
        <test-log label="A">
          <template shadowrootmode="unknown">
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      root.innerHTML = serialized;
      document.body.append(root);
      await waitATickForMutationObserverToRun();
      expect(elementLog).toEqual(['A']);
      hydrateShadowRoots(root);
      expect(elementLog).toEqual(['A']);
      expect(root.querySelector('test-log')?.shadowRoot).toEqual(null);
      assertSerializesAs(root, serialized);
    });

    // TODO(justinfagnani): more tests...
  });
}
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
      shadowTemplate.setAttribute('shadowrootmode', 'open');
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
