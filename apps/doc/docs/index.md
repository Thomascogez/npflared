---
pageType: home

hero:
  name: Firestash
  text: '<img src="/firestash.avif" alt="" class="firestash-hero-logo" />'
  tagline: A private npm registry on your Cloudflare account
  actions:
    - theme: brand
      text: Quick start
      link: /guide/
    - theme: alt
      text: GitHub
      link: https://github.com/colinbate/firestash

features:
  - title: Compatible with npm clients
    details: Publish and install with npm, pnpm or yarn and a registry token. Anything not published here is fetched from the public registry.
    icon: 🔌
    span: 6
  - title: Runs on Cloudflare
    details: A single Worker with D1 and R2, in your own account, within the free tier for most teams.
    icon: ☁️
    span: 6
  - title: An admin area
    details: Browse packages and manage tokens from a web UI, signed in through Cloudflare Access. No user database to run.
    icon: 🔐
    span: 6
  - title: Deploys from Git
    details: Workers Builds deploys every push. Account-specific values are build variables, so one repository serves several accounts.
    icon: 🚀
    span: 6
---
