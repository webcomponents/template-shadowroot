/**
 * @license
 * Copyright (c) 2020 The Polymer Project Authors. All rights reserved.
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

import {hasNativeDeclarativeShadowRoots} from './feature_detect.js';

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

  for (const template of Array.from(root.querySelectorAll('template'))) {
    hydrateShadowRoots(template.content);

    const host = template.parentElement!;
    const mode = template.getAttribute('shadowroot');
    if (mode === 'open' || mode === 'closed') {
      const delegatesFocus = template.hasAttribute('shadowrootdelegatesfocus');
      try {
        const shadow = host.attachShadow({mode, delegatesFocus});
        shadow.append(template.content);
      } catch {
        // there was already a closed shadow root, so do nothing, and
        // don't delete the template
      }
      host.removeChild(template);
    }
  }
};
