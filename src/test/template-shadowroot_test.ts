/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import { hydrateShadowRoots as manualWalkHydration } from '../_implementation/manual_walk.js';
import { transformShadowRoots } from '../_implementation/mutation_observer';
import { hydrateShadowRoots as querySelectorHydration } from '../_implementation/queryselectorall.js';
import { hasNativeDeclarativeShadowRoots } from '../template-shadowroot.js';
import { expect } from '@esm-bundle/chai';

const elementLog: Array<string | null> = [];

// lib.dom.ts is out of date, so declare our own parseFromString here.
interface DOMParser {
  parseFromString(
    string: string,
    type: DOMParserSupportedType,
    options?: {
      includeShadowRoots: boolean;
    }
  ): Document;
}

function renderFragment(html: string) {
  const fragment = (new DOMParser() as DOMParser).parseFromString(
    html,
    'text/html',
    {
      includeShadowRoots: true,
    }
  );

  const root = document.createElement('div');
  root.appendChild(fragment.body.firstChild!);
  document.body.append(root);

  return root;
}

// for syntax highlighting
function html(s: TemplateStringsArray) {
  return s.join('');
}

async function waitATickForMutationObserverToRun() {
  return 0;
}

class TestLogElement extends HTMLElement {
  connectedCallback() {
    const label = this.getAttribute('label');
    elementLog.push(label);
  }
}
customElements.define('test-log', TestLogElement);

// When we serialize
function assertSerializesAs(
  actual: Element,
  expectedSerialization: string,
  syntax = { shadowroot: true, shadowrootmode: true }
) {
  let actualSerialization = getSerializableTree(actual, syntax).innerHTML;
  actualSerialization = actualSerialization.replace(/\n\s+/g, '');
  expectedSerialization = expectedSerialization.replace(/\n\s+/g, '');
  expect(actualSerialization).equal(expectedSerialization);
}
const implementations = [
  ['manual walk ponyfill', manualWalkHydration],
  ['querySelectorAll ponyfill', querySelectorHydration],
  [
    'mutationObserver',
    () => {
      /* see below */
    },
  ],
] as const;
for (const [name, hydrateShadowRoots] of implementations) {
  describe(name, () => {
    let cleanupFn = () => {};
    const setupMutationObserver = ({ force }: { force: boolean }) => {
      if (name === 'mutationObserver') {
        let { cleanup } = transformShadowRoots(document, force);
        cleanupFn = cleanup;
      }
    };
    const automaticHydration =
      name === 'mutationObserver' || hasNativeDeclarativeShadowRoots();
    beforeEach(() => {
      setupMutationObserver({force: false});
    });
    afterEach(() => {
      elementLog.length = 0;
      cleanupFn();
    });

    it('hydrates a template with old DSD syntax', async () => {
      cleanupFn();
      setupMutationObserver({ force: true });
      const serialized = html`
        <test-log label="A">
          <template shadowroot="open">
            <h1>Hello</h1>
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;

      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).eql(['A']);
      }
      hydrateShadowRoots(root, true);
      expect(elementLog).eql(['A', 'B']);
      expect(root.querySelector('test-log')?.shadowRoot).instanceOf(ShadowRoot);

      assertSerializesAs(root, serialized, {
        shadowroot: true,
        shadowrootmode: false,
      });
    });

    it('hydrates a template with streaming DSD syntax', async () => {
      cleanupFn();
      setupMutationObserver({ force: true });
      const serialized = html`
        <test-log label="A">
          <template shadowrootmode="open">
            <h1>Hello</h1>
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;

      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).eql(['A']);
      }
      hydrateShadowRoots(root, true);
      expect(elementLog).eql(['A', 'B']);
      expect(root.querySelector('test-log')?.shadowRoot).instanceOf(ShadowRoot);
      assertSerializesAs(root, serialized, {
        shadowroot: false,
        shadowrootmode: true,
      });
    });

    it('hydrates a template with both syntaxes', async () => {
      const serialized = html`
        <test-log label="A">
          <template shadowroot="open" shadowrootmode="open">
            <h1>Hello</h1>
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).eql(['A']);
      }
      hydrateShadowRoots(root);
      expect(elementLog).eql(['A', 'B']);
      expect(root.querySelector('test-log')?.shadowRoot).instanceOf(ShadowRoot);
      assertSerializesAs(root, serialized);
    });

    it('hydrates nested templates in postorder', async () => {
      const serialized = html`
        <test-log label="A">
          <template shadowroot="open" shadowrootmode="open">
            <h1>Hello</h1>
            <test-log label="B">
              <template shadowroot="open" shadowrootmode="open">
                <h1>World!</h1>
                <test-log label="C"></test-log>
              </template>
            </test-log>
            <test-log label="D"></test-log>
          </template>
        </test-log>
      `;
      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).eql(['A']);
      }
      hydrateShadowRoots(root);
      expect(root.querySelector('test-log')?.shadowRoot).instanceOf(ShadowRoot);
      // If the templates hydrated in document order, D would upgrade before C
      expect(elementLog).eql(['A', 'B', 'C', 'D']);
      assertSerializesAs(root, serialized);
    });

    describe('multiple roots in the same host', () => {
      it('ignores multiple open shadow roots', async () => {
        const content = html`
          <test-log label="A">
            <template shadowroot="open" shadowrootmode="open">
              <test-log label="B"></test-log>
            </template>
            <template shadowroot="open" shadowrootmode="open">
              <test-log label="C"></test-log>
            </template>
          </test-log>
        `;
        const root = renderFragment(content);
        await waitATickForMutationObserverToRun();
        // Divergence between native prototype and this polyfill.
        // Is it intentional? Filed as
        // https://github.com/mfreed7/declarative-shadow-dom/issues/4
        if (hasNativeDeclarativeShadowRoots()) {
          expect(elementLog).eql(['A', 'C']);
          assertSerializesAs(
            root,
            html`
              <test-log label="A">
                <template shadowroot="open" shadowrootmode="open">
                  <test-log label="C"></test-log>
                </template>
              </test-log>
            `
          );
        } else {
          if (!automaticHydration) {
            expect(elementLog).eql(['A']);
          }
          hydrateShadowRoots(root);
          expect(elementLog).eql(['A', 'B']);
          assertSerializesAs(
            root,
            html`
              <test-log label="A">
                <template shadowroot="open" shadowrootmode="open">
                  <test-log label="B"></test-log>
                </template>
              </test-log>
            `
          );
        }
        expect(root.querySelector('test-log')?.shadowRoot).instanceOf(
          ShadowRoot
        );
      });

      it('ignores multiple closed shadow roots', async () => {
        const content = html`
          <test-log label="A">
            <template shadowroot="closed" shadowrootmode="closed">
              <test-log label="B"></test-log>
            </template>
            <template shadowroot="closed" shadowrootmode="closed">
              <test-log label="C"></test-log>
            </template>
          </test-log>
        `;
        const root = renderFragment(content);
        const serialized = `
          <test-log label="A">
          </test-log>
        `;
        await waitATickForMutationObserverToRun();
        // Divergence between native prototype and this polyfill.
        // Is it intentional? Filed as
        // https://github.com/mfreed7/declarative-shadow-dom/issues/4
        if (hasNativeDeclarativeShadowRoots()) {
          expect(elementLog).eql(['A', 'C']);
        } else {
          if (!automaticHydration) {
            expect(elementLog).eql(['A']);
          }
          hydrateShadowRoots(root);
          expect(elementLog).eql(['A', 'B']);
        }
        assertSerializesAs(root, serialized);
        // Closed shadow root, so no .shadowRoot field
        expect(root.querySelector('test-log')?.shadowRoot).equal(null);
      });
    });

    it('normal templates are not modified', async () => {
      const serialized = html`
        <test-log label="A">
          <test-log label="B"></test-log>
          <template>
            <test-log label="C"></test-log>
          </template>
          <test-log label="D"></test-log>
        </test-log>
      `;
      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      expect(elementLog).eql(['A', 'B', 'D']);
      hydrateShadowRoots(root);
      expect(elementLog).eql(['A', 'B', 'D']);
      assertSerializesAs(root, serialized);
      expect(root.querySelector('test-log')?.shadowRoot).equal(null);
    });

    it('shadow roots are expanded inside regular templates', async () => {
      const serialized = html`
        <test-log label="A">
          <test-log label="B"></test-log>
          <template>
            <test-log label="C">
              <template shadowroot="open" shadowrootmode="open">
                <div>Inner</div>
              </template>
            </test-log>
          </template>
          <test-log label="D"></test-log>
        </test-log>
      `;
      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      hydrateShadowRoots(root);
      const innerShadowRoot = root
        .querySelector('template')
        ?.content.querySelector('test-log')?.shadowRoot;
      expect(innerShadowRoot?.textContent?.trim()).equal('Inner');
      assertSerializesAs(root, serialized);
      expect(root.querySelector('test-log')?.shadowRoot).equal(null);
      expect(
        root.querySelector('template')?.content.querySelector('test-log')
          ?.shadowRoot
      ).instanceOf(ShadowRoot);
    });

    it('can make closed shadow roots', async () => {
      const content = html`
        <test-log label="A">
          <template shadowroot="closed" shadowrootmode="closed">
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      const root = renderFragment(content);
      // closed shadow root does not get serialized
      const serialized = `
        <test-log label="A">
        </test-log>
      `;
      await waitATickForMutationObserverToRun();
      if (!automaticHydration) {
        expect(elementLog).eql(['A']);
      }
      hydrateShadowRoots(root);
      expect(elementLog).eql(['A', 'B']);
      assertSerializesAs(root, serialized);
      expect(root.querySelector('test-log')?.shadowRoot).equal(null);
    });

    it('ignores shadowrootmode="unknown"', async () => {
      const serialized = html`
        <test-log label="A">
          <template shadowrootmode="unknown">
            <test-log label="B"></test-log>
          </template>
        </test-log>
      `;
      const root = renderFragment(serialized);
      await waitATickForMutationObserverToRun();
      expect(elementLog).eql(['A']);
      hydrateShadowRoots(root);
      expect(elementLog).eql(['A']);
      expect(root.querySelector('test-log')?.shadowRoot).equal(null);
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
function getSerializableTree<T extends Node>(
  node: T,
  syntax: { shadowroot: boolean; shadowrootmode: boolean }
): T {
  const children = (node as Partial<Element>).childNodes;
  if (children === undefined || node.nodeType === Node.TEXT_NODE) {
    return node.cloneNode(true) as T;
  }
  let clone;
  if (isDocumentFragment(node)) {
    clone = document.createDocumentFragment();
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
      if (syntax.shadowroot) {
        shadowTemplate.setAttribute('shadowroot', 'open');
      }
      if (syntax.shadowrootmode) {
        shadowTemplate.setAttribute('shadowrootmode', 'open');
      }
      copyTemplateContents(node.shadowRoot, shadowTemplate.content, syntax);
      clone.appendChild(shadowTemplate);
    }
  }
  for (let i = 0; i < children.length; i++) {
    clone.appendChild(getSerializableTree(children[i], syntax));
  }
  if (isTemplate(node)) {
    copyTemplateContents(
      node.content,
      (clone as HTMLTemplateElement).content,
      syntax
    );
  }
  return clone as unknown as T;
}

function copyTemplateContents(
  from: DocumentFragment | ShadowRoot,
  to: DocumentFragment,
  syntax: { shadowroot: boolean; shadowrootmode: boolean }
) {
  const contentChildren = from.childNodes;
  for (let i = 0; i < contentChildren.length; i++) {
    to.appendChild(getSerializableTree(contentChildren[i], syntax));
  }
}
