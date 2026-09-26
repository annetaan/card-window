<h1 align="center">card-window</h1>

Card window works by only rendering part of a large data set (just enough to fill the viewport).
It is very much inspired by Brian Vaughn's react-window.

## Installation

`@annetaan/card-window` is available as an npm package.

```bash
// with npm
npm install @annetaan/card-window

// with yarn
yarn add @annetaan/card-window
```

## Usage

Learn more at [annetaan.github.io/card-window/](https://annetaan.github.io/card-window/)

```typescript
import * as React from 'react';
import ReactDOM from 'react-dom';

import { CardWindow, CardProps, range } from '@annetaan/card-window';

const SampleCard: React.FC<CardProps> = ({ index, style, row, col }) => (
  <div style={style}>
    <h2>{index}</h2>
    <p>row: {row}, col: {col}</p>
  </div>
);

const App: React.FC = () => {
  const data = range(10000); // [0, 1, 2, ..., 9999]
  const cardRect = { width: 200, height: 120 };
  return (
    <div style={{ height: 400 }}>
      <CardWindow data={data} cardRect={cardRect}>
        {SampleCard}
      </CardWindow>
    </div>
  );
};

ReactDOM.render(<App />, document.querySelector('#app'));
```
