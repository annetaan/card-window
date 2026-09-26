// Node follows the `import` condition of the `exports` field to the ESM build.
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import DefaultCardWindow, { CardWindow, range } from '@annetaan/card-window';

// CardWindow is a forwardRef component, so it is an object.
assert.equal(DefaultCardWindow, CardWindow);
assert.equal(CardWindow.$$typeof, Symbol.for('react.forward_ref'));
assert.deepEqual(range(3), [0, 1, 2]);

const Card = ({ index, style }) => createElement('div', { style }, index);
const html = renderToString(
  createElement(CardWindow, { data: range(100), cardRect: { width: 200, height: 120 } }, Card)
);
assert.match(html, /^<div/);

console.log('esm: ok');
