import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// Runs in Node.js. Switching to a custom domain = change SITE_BASE_URL (and url) + add static/CNAME.
const baseUrl = process.env.SITE_BASE_URL ?? '/de-interview-handbook/';
const repoUrl = 'https://github.com/jagadeshjamjala/de-interview-handbook';

const config: Config = {
  title: 'Data Engineering Interview Handbook',
  tagline: 'Practice SQL, data modeling and pipeline design for DE interviews, at your level.',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://jagadeshjamjala.github.io',
  baseUrl,
  trailingSlash: false,

  organizationName: 'jagadeshjamjala',
  projectName: 'de-interview-handbook',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `${repoUrl}/tree/main/apps/website/`,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: `${repoUrl}/tree/main/apps/website/`,
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'DE Interview Handbook',
      logo: {
        alt: 'DE Interview Handbook logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'handbook',
          position: 'left',
          label: 'Handbook',
        },
        {to: '/questions', label: 'Questions', position: 'left'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: repoUrl,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Handbook',
          items: [
            {label: 'Start here', to: '/docs/start-here'},
            {label: 'Question bank', to: '/questions'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'GitHub', href: repoUrl},
            {label: 'Contribute', href: `${repoUrl}/blob/main/CONTRIBUTING.md`},
            {label: 'Blog', to: '/blog'},
          ],
        },
      ],
      copyright: `Code MIT · Content CC BY-SA 4.0 · Structure inspired by the Tech Interview Handbook.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['sql', 'python', 'yaml', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
