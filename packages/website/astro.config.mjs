import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://annetaan.github.io',
  base: '/card-window',
  integrations: [
    starlight({
      title: 'card-window',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/annetaan/card-window' }],
      editLink: { baseUrl: 'https://github.com/annetaan/card-window/edit/main/packages/website/' },
      sidebar: [{ label: 'Guides', items: ['intro'] }],
    }),
    react(),
  ],
  // packages/main resolves React 18 as a dev dependency; the site must use one copy of React 19.
  vite: { resolve: { dedupe: ['react', 'react-dom'] } },
});
