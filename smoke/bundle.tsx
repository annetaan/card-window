// Bundlers pick the ESM build through the `module` field.
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { CardProps, CardWindow, range } from '@annetaan/card-window';

const Card: React.FC<CardProps> = ({ index, style }) => <div style={style}>{index}</div>;

const html = renderToString(
  <CardWindow data={range(100)} cardRect={{ width: 200, height: 120 }}>
    {Card}
  </CardWindow>
);
assert.match(html, /^<div/);

console.log('bundle: ok');
