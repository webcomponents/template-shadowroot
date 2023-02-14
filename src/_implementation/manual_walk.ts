/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {hasNativeDeclarativeShadowRoots} from './feature_detect.js';
import {hasNoParentElement, isElement, isTemplate} from './util.js';

/*
 * Traverses the DOM to find all <template> elements with a `shadowrootmode`
 * attribute and move their content into a ShadowRoot on their parent element.
 *
 * This processing is done bottom up so that when top-level <template>
 * elements are hydrated, their contents are already hydrated and in the
 * final correct structure of elements and shadow roots.
 */
export const hydrateShadowRoots = (root: ParentNode) => {
  if (hasNativeDeclarativeShadowRoots()) {
    return;  // nothing to do
  }

  // Approaches to try and benchmark:
  //  - manual walk (current implementation)
  //  - querySelectorAll
  //  - TreeWalker

  // Stack of nested templates that we're currently processing. Use to
  // remember how to get from a <template>.content DocumentFragment back to
  // its owner <template>
  const templateStack: Array<HTMLTemplateElement> = [];

  let currentNode: Element|DocumentFragment|null = root.firstElementChild;

  // The outer loop traverses down, looking for <template shadowrootmode>
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
        if (hasNoParentElement(currentNode)) {
          // We must be at a <template>'s content fragment.
          template = templateStack.pop()!;
          const host = template.parentElement!;
          const mode = template.getAttribute('shadowrootmode');
          currentNode = template;
          if (mode === 'open' || mode === 'closed') {
            const delegatesFocus =
                template.hasAttribute('shadowrootdelegatesfocus');
            try {
              const shadow = host.attachShadow({mode, delegatesFocus});
              shadow.append(template.content);
            } catch {
              // there was already a shadow root.
              // TODO(rictic): log an error event?
            }
          } else {
            template = undefined;
          }
        } else {
          const nextSibling: Element|null|undefined =
              currentNode.nextElementSibling;
          if (nextSibling != null) {
            currentNode = nextSibling;
            if (template !== undefined) {
              template.parentElement!.removeChild(template);
            }
            break;
          }
          const nextAunt: Element|null|undefined =
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
