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

let hasNative: boolean|undefined;
export function hasNativeDeclarativeShadowRoots(): boolean {
  if (hasNative === undefined) {
    const div = document.createElement('div');
    div.innerHTML = `<div><template shadowroot="open"></template></div>`;
    hasNative = !!div.firstElementChild!.shadowRoot;
  }
  return hasNative;
}

/*
 * Traverses the DOM to find all <template> elements with a `shadowroot`
 * attribute and move their content into a ShadowRoot on their parent element.
 *
 * This processing is done depth-first so that when top-level <template>
 * elements are hydrated, their contents are already hydrated and in the
 * final correct structure of elements and shadow roots.
 */
export const hydrateShadowRoots = (root: ParentNode) => {
  if (hasNativeDeclarativeShadowRoots()) {
    return;  // nothing to do
  }

  // Stack of nested templates that we're currently processing. Use to
  // remember how to get from a <template>.content DocumentFragment back to
  // its owner <template>
  const templateStack: Array<HTMLTemplateElement> = [];

  let currentNode: Element|DocumentFragment|null = root.firstElementChild;

  // The outer loop traverses down, looking for <template shadowroot>
  // elements. The inner loop traverses back up, hydrating them in a postorder
  // traversal.
  while (currentNode !== root && currentNode !== null) {
    if (isTemplate(currentNode)) {
      templateStack.push(currentNode);
      currentNode = currentNode.content;
    } else if (currentNode.firstElementChild !== null) {
      // Traverse down
      currentNode = currentNode.firstElementChild;
    } else if (
        isElement(currentNode) && currentNode.nextElementSibling !== null) {
      // Element is empty, but has a next sibling. Traverse that.
      currentNode = currentNode.nextElementSibling;
    } else {
      // Element is empty and the last child. Traverse to next aunt/grandaunt.

      // Store templates we hydrate for one loop so that we can remove them
      // *after* traversing to their successor.
      let template: HTMLTemplateElement|undefined;

      while (currentNode !== root && currentNode !== null) {
        if (currentNode.parentElement === null) {
          // We must be at a <template>'s content fragment.
          template = templateStack.pop()!;
          const host = template.parentElement!;
          const mode = template.getAttribute('shadowroot');
          currentNode = template;
          if (mode === 'open' || mode === 'closed') {
            const delegatesFocus =
                template.hasAttribute('shadowrootdelegatesfocus');
            if (host.shadowRoot === null) {
              const shadow = host.attachShadow({mode, delegatesFocus});
              shadow.append(template.content);
            }
          } else {
            template = undefined;
          }
        } else {
          const nextSibling: Element|null|undefined =
              (currentNode as Partial<Element>).nextElementSibling;
          if (nextSibling != null) {
            currentNode = nextSibling;
            break;
          }
          const nextAunt: Element|null =
              currentNode.parentElement?.nextElementSibling;
          if (nextAunt != null) {
            currentNode = nextAunt;
            if (template !== undefined) {
              template.parentElement!.removeChild(template);
            }
            break;
          }
          currentNode = currentNode.parentElement;
          if (template !== undefined) {
            template.parentElement!.removeChild(template);
            template = undefined;
          }
        }
      }
    }
  }
};

const isTemplate = (e: Node): e is HTMLTemplateElement =>
    (e as Partial<Element>).tagName === 'TEMPLATE';
const isElement = (e: Node): e is HTMLElement =>
    e.nodeType === Node.ELEMENT_NODE;
