import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';
import { CardWindow, range } from '@annetaan/card-window';

type FeatureItem = {
  title: string;
  image: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    image: '/card-window/img/undraw_docusaurus_mountain.svg',
    description: (
      <>
        Card Window requires only 3 props.
        <br />
        And it has simple option props.
        <br />
        Check out the tutorial right away!
      </>
    ),
  },
  {
    title: 'Automatically Adjust Columns',
    image: '',
    description: (
      <>
        The card window uses <code>ResizeObserver</code> internally. Therefore, the column is automatically adjusted
        according to the element size specified by CSS.
      </>
    ),
  },
  {
    title: 'Inspired by "react-window"',
    image: '/card-window/img/undraw_docusaurus_react.svg',
    description: (
      <>
        It works by only rendering part of a large data set (just enough to fill the viewport). It is very much inspired
        by Brian Vaughn's react-window.
      </>
    ),
  },
];

const cardSize = 80;

function FeatureDemo({ title, description }: FeatureItem) {
  const ref = React.useRef(range(1000).map((i) => (i % 30) * 1.5));

  return (
    <div className={clsx('col col--4')}>
      <div className={styles.demo} style={{ marginTop: 20, marginBottom: 20, marginLeft: 'auto', marginRight: 'auto' }}>
        <CardWindow
          data={ref.current}
          cardRect={{ width: cardSize, height: cardSize }}
          root={{ style: { height: 160 } }}
          container={{ style: { background: 'linear-gradient(65deg, #F13F79, #2196f3)' } }}
          lastRowAlign="left"
        >
          {({ data, index, style }) => (
            <div style={{ ...style, borderRadius: 'var(--ifm-card-border-radius)', overflow: 'hidden' }}>
              <img alt="docusaurus" src={`https://picsum.photos/seed/${data[index]}/${cardSize}/${cardSize}`} />
            </div>
          )}
        </CardWindow>
      </div>

      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Feature({ title, image, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img className={styles.featureSvg} alt={title} src={image} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <Feature {...FeatureList[0]} />
          <FeatureDemo {...FeatureList[1]} />
          <Feature {...FeatureList[2]} />
        </div>
      </div>
    </section>
  );
}
