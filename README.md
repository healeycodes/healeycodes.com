[![e2e](https://github.com/healeycodes/healeycodes.com/actions/workflows/e2e.yml/badge.svg)](https://github.com/healeycodes/healeycodes.com/actions/workflows/e2e.yml)

# healeycodes.com

My home on the web! A collection of thoughts and software experiments.

Issues/bug reports are very welcome.

## Features

- Next.js hosted on Vercel
- Markdown + images
- RSS feed (links, not full content)
- Simple design focused on content (responsive for desktop/mobile)
- Code highlighting via `prism-react-renderer`
- Newsletter CTA (powered by Buttondown)
- All core features work without JavaScript enabled
- Privacy-friendly analytics via GoatCounter

Most configuration is handled via `siteConfig.json`

## Tests

e2e tests with Playwright. See `.github\workflows\e2e.yml`.

```
npm i
npx playwright install
npx playwright install-deps
npm run e2e:test
```

## Dev

```
npm i
npm run dev
```

## Copying

Feel free to use any of my writing or code for educational reasons (e.g. you're teaching a class).

Otherwise, check with me before republishing my writing or code (I'll give permission 99% of the time).
