/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { CardWindow, range } from '@annetaan/card-window';

const SampleCard = ({ index, style, row, col }) => (
  <div className="card" style={style}>
    <div className="card__body">
      <h2>{index}</h2>
      <p>
        row: {row}, col: {col}
      </p>
    </div>
  </div>
);

const LoadingComponent = ({ style }) => (
  <div className="card" style={style}>
    <div className="card__body">
      <h2>Loading...</h2>
    </div>
  </div>
);

const Navbar = ({ children }) => (
  <nav className="navbar">
    <div className="navbar__inner">
      <div className="navbar__items">{children}</div>
    </div>
  </nav>
);

const useDropdown = (label, list, init = 0) => {
  const [index, set] = React.useState(init);
  const element = (
    <div className="navbar__item dropdown dropdown--hoverable">
      <p className="navbar__link">{`${label}: ${list[index]}`}</p>
      <ul className="dropdown__menu">
        {list.map((item, i) => (
          <li key={item}>
            <p className="dropdown__link" onClick={() => set(i)}>
              {item}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
  return [list[index], element];
};

const useTabs = (list, prefix = '') => {
  const [index, set] = React.useState(0);
  const element = (
    <ul className="tabs tabs--block">
      {list.map((item, i) => {
        let className = 'tabs__item';
        if (i === index) className += ' tabs__item--active';
        return <li key={i} className={className} onClick={() => set(i)}>{prefix + item}</li>;
      })}
    </ul>
  );
  return [list[index], element];
};

const ReactLiveScope = {
  React,
  ...React,
  CardWindow,
  range,
  SampleCard,
  LoadingComponent,
  Navbar,
  useDropdown,
  useTabs,
};

export default ReactLiveScope;
