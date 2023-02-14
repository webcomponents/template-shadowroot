/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

// lib.dom.ts is out of date, so declare our own parseFromString here.
interface DOMParser {
  parseFromString(string: string, type: DOMParserSupportedType, options?: {
    includeShadowRoots: boolean;
  }): Document;
}

// This isn't ideal. Setting .innerHTML is not compatible with some
// TrustedTypes CSP policies. Discussion at:
//     https://github.com/mfreed7/declarative-shadow-dom/issues/3
let hasNative: boolean|undefined;
export function hasNativeDeclarativeShadowRoots(): boolean {
  if (hasNative === undefined) {
    const html = `<div><template shadowrootmode="open"></template></div>`;
    const fragment = (new DOMParser() as DOMParser).parseFromString(html, 'text/html', {
      includeShadowRoots: true
    });
    hasNative = !!fragment.querySelector('div')?.shadowRoot;
  }
  return hasNative;
}
