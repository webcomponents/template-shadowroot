# template-attach-shadow

Declarative Shadow DOM for SSR

## Overview

This package provides a function, `hydrateShadowRoots`, that converts `<template>` elements with an `attach-shadow` attribute into ShadowRoots on the template's parent element.

This allows HTML with shadow roots to be serialized to plain HTML, and the serialized shadow roots "rehydrated" (separate from component hydration) on the client.

`<template>` is used so that DOM in this serialialized state is inert until it has been transformed back to the correct shadow root including structure. This ensures styling is correct, and script and custom elements don't see the DOM in this pre-hydration state.

`<template>`s are transformed in _postorder_ - that is bottom up - so that parent elements do not see children with serialized shadow roots, and so that upgrades happen in document order once the top-most shadow root is hydrated.
