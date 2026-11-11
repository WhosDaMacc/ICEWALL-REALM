// A-Frame typing notes:
// The battle components build A-Frame scenes two ways:
//  1. Plain DOM calls such as el.setAttribute('material', { color: '#8B4513' }).
//     A-Frame accepts object values there at runtime, but the DOM typings
//     only allow string values for setAttribute, so the type checker rejects
//     them. The Element overload below covers A-Frame's object form
//     project-wide without changing any scene-building logic.
//  2. JSX tags (<a-scene>, <a-marker>, <a-entity>) in NavitarDisplay.
//     React's JSX typings don't know those custom elements, so they are
//     declared here with the attributes the code actually uses.
// String setAttribute calls are unaffected by either declaration.
//
// NOTE: @types/react is v19 even though the runtime is React 18, so JSX
// element types resolve through React.JSX.IntrinsicElements (via
// react/jsx-runtime), NOT the global JSX namespace. Augmenting the global
// JSX namespace has no effect here — the tags must be declared by
// augmenting the 'react' module's JSX namespace. That is why the
// declaration below uses `declare module 'react'`.
import type React from 'react';

type AFrameElementProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
>;

declare global {
  interface Element {
    setAttribute(qualifiedName: string, value: string | Record<string, unknown>): void;
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'a-scene': AFrameElementProps & {
        'vr-mode-ui'?: string;
        arjs?: string;
        background?: string;
        // A-Frame treats these as present-or-not flags, so JSX may pass
        // them bare (<a-scene embedded />) as booleans or as strings.
        embedded?: string | boolean;
        renderer?: string;
      };
      'a-marker': AFrameElementProps & {
        preset?: string;
        type?: string;
        url?: string;
      };
      'a-entity': AFrameElementProps & {
        // Bare in JSX (<a-entity camera />) = boolean true; A-Frame also
        // accepts a string value for it.
        camera?: string | boolean;
        position?: string;
        rotation?: string;
        scale?: string;
        geometry?: string;
        material?: string;
        'gltf-model'?: string;
        'animation-mixer'?: string;
        animation?: string;
      };
    }
  }
}

export {};
