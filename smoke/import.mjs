// Node has no `exports` field to follow, so `import` loads the CommonJS build.
// This checks that its named exports are visible to ESM.
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { CardWindow, range } from '@annetaan/card-window';

// CardWindow is a forwardRef component, so it is an object.
assert.equal(CardWindow.$$typeof, Symbol.for('react.forward_ref'));
assert.deepEqual(range(3), [0, 1, 2]);

const Card = ({ index, style }) => createElement('div', { style }, index);
const html = renderToString(
  createElement(CardWindow, { data: range(100), cardRect: { width: 200, height: 120 } }, Card)
);
assert.match(html, /^<div/);

console.log('esm: ok');
