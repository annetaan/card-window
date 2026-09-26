// Node resolves `require` to the CommonJS build through the `main` field.
const assert = require('node:assert/strict');
const { createElement } = require('react');
const { renderToString } = require('react-dom/server');
const { CardWindow, range } = require('@annetaan/card-window');

// CardWindow is a forwardRef component, so it is an object.
assert.equal(CardWindow.$$typeof, Symbol.for('react.forward_ref'));
assert.deepEqual(range(3), [0, 1, 2]);

const Card = ({ index, style }) => createElement('div', { style }, index);
const html = renderToString(
  createElement(CardWindow, { data: range(100), cardRect: { width: 200, height: 120 } }, Card)
);
assert.match(html, /^<div/);

console.log('cjs: ok');
