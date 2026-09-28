import react from '@astrojs/react';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

export default defineConfig({
  site: 'https://annetaan.github.io',
  base: '/card-window',
  // The Docusaurus site served these paths. Astro does not prefix redirect targets with `base`.
  redirects: {
    '/docs/intro': '/card-window/intro/',
    '/docs/examples': '/card-window/examples/',
    '/docs/example-utils': '/card-window/example-utils/',
    '/docs/api/modules': '/card-window/api/readme/',
  },
  integrations: [
    starlight({
      title: 'card-window',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/annetaan/card-window' }],
      editLink: { baseUrl: 'https://github.com/annetaan/card-window/edit/main/packages/website/' },
      // Generates the API reference from packages/main/src into git-ignored src/content/docs/api/ on build, check, dev.
      plugins: [
        starlightTypeDoc({
          entryPoints: ['../main/src/index.ts'],
          tsconfig: '../main/tsconfig.json',
          output: 'api',
          sidebar: { label: 'API reference' },
          typeDoc: { disableSources: true },
        }),
      ],
      sidebar: [{ label: 'Guides', items: ['intro', 'examples', 'example-utils'] }, typeDocSidebarGroup],
    }),
    react(),
  ],
  // packages/main resolves React 18 as a dev dependency; the site must use one copy of React 19.
  vite: { resolve: { dedupe: ['react', 'react-dom'] } },
});
