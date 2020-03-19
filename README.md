# Declarative Shadow DOM Ponyfill

Declarative Shadow DOM for SSR

A [ponyfill](https://ponyfill.com/) of the API described by Mason Freed at https://github.com/mfreed7/declarative-shadow-dom.

## Overview

This package provides a function, `hydrateShadowRoots`, that converts `<template>` elements with a `shadowroot` attribute into ShadowRoots on the template's parent element.

This allows HTML with shadow roots to be serialized to plain HTML, and the serialized shadow roots "rehydrated" (separate from component hydration) on the client.

`<template shadowroot>` elements are transformed bottom up so that in the case where they're nested, all elements within the declarative shadow tree stay inert until they have all been moved from their `<template shadowroot>` elements.

If native support for `<template shadowroot>` is present, `hydrateShadowRoots` does nothing when called.

### Known limitations

* Does not currently look into imperatively created shadow roots.
* The mutation observer implementation
  * May not work properly in the face of streaming HTML parsing. Needs investigation.
  * Will not notice imperatively created `<template shadowroot>` elements inside of other shadow roots.
* Not enough benchmarks, and benchmarks of insufficient quality to be confident of good performance.
