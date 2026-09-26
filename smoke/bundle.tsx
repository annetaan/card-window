// Bundlers pick the ESM build through the `import` condition of the `exports` field.
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import DefaultCardWindow, { CardProps, CardWindow, range } from '@annetaan/card-window';

assert.equal(DefaultCardWindow, CardWindow);

const Card: React.FC<CardProps> = ({ index, style }) => <div style={style}>{index}</div>;

const html = renderToString(
  <CardWindow data={range(100)} cardRect={{ width: 200, height: 120 }}>
    {Card}
  </CardWindow>
);
assert.match(html, /^<div/);

console.log('bundle: ok');
