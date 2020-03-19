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
  debugger;
  const mutationObserver = new MutationObserver((mutations, _) => {
    debugger;
    for (const mutation of mutations) {
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
