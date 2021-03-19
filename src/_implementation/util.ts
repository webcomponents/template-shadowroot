/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

export const hasNoParentElement =
    (e: Element|DocumentFragment): e is DocumentFragment =>
        e.parentElement === null;
export const isTemplate = (e: Node): e is HTMLTemplateElement =>
    (e as Partial<Element>).tagName === 'TEMPLATE';
export const isElement = (e: Node): e is HTMLElement =>
    e.nodeType === Node.ELEMENT_NODE;
