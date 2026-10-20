# What is Npflared?

Npflared is a self hostable serverless private npm registry. It's build on top of cloudflare workers, d1 and r2.

## Why?

If you need an easy way to distribute npm packages internally or to your client at any cost, Npflared is the solution for you.

Npflared is not aiming to be a fully drop-in replacement for a npm registry. It's goal is to be a private registry for you and your team


## Using Npflared

### Publishing a package
Set the `publishConfig` to your Npflared instance
```js title="package.json" {4-6}
{
  "name": "@acme/std",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "http://localhost:8787"
  },
  "exports": {
    ".": "./index.js"
  }
}
```
Set the `_authToken` in your `.npmrc`
```txt title=".npmrc"
//localhost:8787/:_authToken=YOUR_AUTH_TOKEN
```

Then you can publish your package 🎉
```bash
npm publish
```

### Installing a package
Set the `_authToken` in your `.npmrc`
```txt title=".npmrc"
//localhost:8787/:_authToken=YOUR_AUTH_TOKEN
```

Then you can install your package 🎉
```bash
npm install @acme/std --registry http://localhost:8787
```
