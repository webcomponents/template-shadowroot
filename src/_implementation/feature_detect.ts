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
