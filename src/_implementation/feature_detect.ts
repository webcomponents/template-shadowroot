/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// This isn't ideal. Setting .innerHTML is not compatible with some
// TrustedTypes CSP policies. Discussion at:
//     https://github.com/mfreed7/declarative-shadow-dom/issues/3
let hasNative: boolean|undefined;
export function hasNativeDeclarativeShadowRoots(): boolean {
  if (hasNative === undefined) {
    const div = document.createElement('div');
    div.innerHTML = `<div><template shadowroot="open"></template></div>`;
    hasNative = !!div.firstElementChild!.shadowRoot;
  }
  return hasNative;
}
