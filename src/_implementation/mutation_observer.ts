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

import {hydrateShadowRoots} from './default_implementation';

import {hasNativeDeclarativeShadowRoots} from './feature_detect';

export function transformShadowRoots(within: Node = document) {
  if (hasNativeDeclarativeShadowRoots()) {
    return {mutationObserver: undefined, cleanup() {}};  // do nothing
  }
  const mutationObserver = new MutationObserver((mutations, _) => {
    for (const mutation of mutations) {
      // TODO(rictic): test with streamed HTML that pauses in the middle
      //     of a <template shadowroot> element. Do we get a mutation
      //     with only part of the template's contents? What happens when
      //     we remove the template from the DOM?
      //     Tricky!
      hydrateShadowRoots(mutation.target as unknown as ParentNode);
    }
  });
  mutationObserver.observe(within, {childList: true, subtree: true});
  return {
    mutationObserver, cleanup() {
      mutationObserver.disconnect();
    }
  }
}
