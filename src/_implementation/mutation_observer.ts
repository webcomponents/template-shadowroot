/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {hydrateShadowRoots} from './default_implementation.js';

import {hasNativeDeclarativeShadowRoots} from './feature_detect.js';

export function transformShadowRoots(within: Node = document) {
  if (hasNativeDeclarativeShadowRoots()) {
    return {mutationObserver: undefined, cleanup() {}};  // do nothing
  }
  const mutationObserver = new MutationObserver((mutations, _) => {
    for (const mutation of mutations) {
      // TODO(rictic): test with streamed HTML that pauses in the middle
      //     of a <template shadowroot[mode]> element. Do we get a mutation
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
