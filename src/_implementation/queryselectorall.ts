/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {hasNativeDeclarativeShadowRoots} from './feature_detect.js';

interface StackEntry {
  /**
   * The nearest ancestor <template> element, if any, of the templates.
   */
  template: HTMLTemplateElement|undefined;
  /**
   * A stack of template elements inside `template` – or `root` if `template` is
   * undefined – to be processed.
   *
   * The array is in reverse document order, such that the elements at the end
   * of the array should be processed first (so that we can use templates.pop()
   * to get the next element to process).
   */
  templates: HTMLTemplateElement[];
}

/*
 * Traverses the DOM to find all <template> elements with a `shadowroot`
 * attribute and move their content into a ShadowRoot on their parent element.
 *
 * This processing is done bottom up so that when top-level <template>
 * elements are hydrated, their contents are already hydrated and in the
 * final correct structure of elements and shadow roots.
 */
export const hydrateShadowRoots = (root: Element|DocumentFragment) => {
  if (hasNativeDeclarativeShadowRoots()) {
    return;  // nothing to do
  }
  const stack: StackEntry[] = [{
    template: undefined,
    templates: Array.from(root.querySelectorAll('template')).reverse()
  }];
  while (stack.length > 0) {
    const context = stack[stack.length - 1];
    const childTemplate = context.templates.pop();
    if (childTemplate === undefined) {
      const template = context.template;
      if (template !== undefined) {
        const host = template.parentElement!;
        const mode = template.getAttribute('shadowroot');
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
          host.removeChild(template);
        }
      }
      stack.pop();
      continue;
    }
    stack.push({
      template: childTemplate,
      templates: Array.from(childTemplate.content.querySelectorAll('template'))
                     .reverse()
    });
  }
};
