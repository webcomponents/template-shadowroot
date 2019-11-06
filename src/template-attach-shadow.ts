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

/* 
 * Traverses the DOM to find all <template> elements with an `attach-shadow`
 * attribute and move their content into a ShadowRoot on their parent element.
 *
 * This processing is done depth-first so that when top-level <template>
 * elements are hydrated, their contents are already hydrated and in the
 * final correct structure of elements and shadow roots.
 */
export const hydrateShadowRoots = (root: ParentNode) => {
  // Stack of nested templates that we're currently processing. Use to remember
  // how to get from a <template>.content DocumentFragment back to its owner
  // <template>
  const templateStack: Array<HTMLTemplateElement> = [];

  let currentNode: Element | DocumentFragment | null = root.firstElementChild;

  // The outer loop traverses down, looking for <template attach-shadow>
  // elements. The inner loop traverses back up, hydrating them in a postorder
  // traversal.
  while (currentNode !== root && currentNode !== null) {
    if (isTemplate(currentNode)) {
      templateStack.push(currentNode);
      currentNode = currentNode.content;
    } else if (currentNode.firstElementChild !== null) {
      // Traverse down all the way
      currentNode = currentNode.firstElementChild;
    } else if (isElement(currentNode) && currentNode.nextElementSibling !== null) {
      // If the element is empty, traverse next sibling
      currentNode = currentNode.nextElementSibling;
    } else {
      // If the element is empty and the last child, traverse to the successor

      // Store templates we hydrate for one loop so that we can remove them
      // *after* traversing to their successor.
      let template: HTMLTemplateElement | undefined;

      while (currentNode !== root && currentNode !== null) {
        if (currentNode.parentElement === null) {
          // We must be at a <template>'s content fragment.
          template = templateStack.pop()!;
          const shadowMode = template.getAttribute('attach-shadow');
          if (shadowMode !== null) {
            const host = template.parentElement!;
            const shadow = host.attachShadow({mode: shadowMode as ShadowRootMode});
            // TODO(justinfagnani): Simply appending the template content
            // doesn't upgrade the nodes until the top-most tempalte is hydrated
            // and only if it's connected. We don't want to upgrade elements
            // early though (since parent's might not be awake to listen for
            // events, etc.) so we don't want to use document.importNode() here.
            // customElements.upgrade() seems to do the right thing, in that
            // it'll only upgrade at the top. Make sure it's available.
            shadow.append(template.content);
            customElements.upgrade(host);
            currentNode = template;
          }
        } else {
          if (currentNode.parentElement?.nextElementSibling !== null) {
            currentNode = currentNode.parentElement!.nextElementSibling;
            template = template?.remove() as undefined;
            break;
          }
          currentNode = currentNode.parentElement;
          template = template?.remove() as undefined;
        }
      }
    }
  }
};

const isTemplate = (e: unknown): e is HTMLTemplateElement => e && (e as Element).tagName === 'TEMPLATE';
const isElement = (e: unknown): e is HTMLElement => e && (e as Element).nodeType === Node.ELEMENT_NODE;
