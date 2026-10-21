import { language as bash } from "@twinkleplop/bash";
import { language as json } from "@twinkleplop/json";
import themeDark from "@twinkleplop/theme-github/dark?raw";
import themeLight from "@twinkleplop/theme-github/light?raw";
import { language as toml } from "@twinkleplop/toml";
import { html, raw } from "hono/html";
import type { FC } from "hono/jsx";
import { PRODUCT_NAME } from "#brand";

/** Highlighters for the snippets on the page. An .npmrc file is close enough to TOML to read well. */
const highlighters = { bash: bash(), json: json(), npmrc: toml() };

type CodeBlockProps = { lang: keyof typeof highlighters; code: string };

const CodeBlock: FC<CodeBlockProps> = ({ lang, code }) => raw(highlighters[lang](code));

const styles = `
${themeLight}
@media (prefers-color-scheme: dark) {
${themeDark}
}
:root { color-scheme: light dark; --bg: #fff; --fg: #18181b; --muted: #71717a; --border: #e4e4e7; --code: #f4f4f5; --accent: #ea580c; }
@media (prefers-color-scheme: dark) { :root { --bg: #09090b; --fg: #fafafa; --muted: #a1a1aa; --border: #27272a; --code: #18181b; --accent: #f97316; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 44rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
h1 { font-size: 1.75rem; margin: 0 0 .25rem; }
h1 small { display: block; font-size: 1rem; font-weight: 400; color: var(--muted); }
h2 { font-size: 1.2rem; margin: 2.5rem 0 .75rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
a { color: var(--accent); }
code { font: .9em ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--code); padding: .1em .35em; border-radius: .3em; }
pre.twinkleplop { background: var(--twp-background); border: 1px solid var(--border); border-radius: .5rem; padding: .9rem 1rem; overflow-x: auto; line-height: 1.5; }
pre.twinkleplop code { background: none; padding: 0; color: var(--twp-identifier); }
table { border-collapse: collapse; width: 100%; font-size: .95rem; }
th, td { text-align: left; padding: .45rem .6rem; border-bottom: 1px solid var(--border); vertical-align: top; }
th { color: var(--muted); font-weight: 600; }
nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; font-size: .95rem; }
.muted { color: var(--muted); }
`;

type UsagePageProps = {
	/** Origin of the registry, eg. `https://registry.example.com`. */
	origin: string;
	/** Host of the registry, as written in `.npmrc` lines, eg. `registry.example.com`. */
	host: string;
	/** Address of the product documentation, when the deployment points to one. */
	docsUrl?: string;
};

/**
 * What users of a registry need to know: how to read from it, publish to it and get a token.
 * Rendered by the worker at the root of the registry, with the registry's own address filled in.
 */
const UsagePage: FC<UsagePageProps> = ({ origin, host, docsUrl }) => (
	<html lang="en">
		<head>
			<meta charset="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="robots" content="noindex" />
			<title>{`${host} · ${PRODUCT_NAME} registry`}</title>
			<style>{raw(styles)}</style>
		</head>
		<body>
			<main>
				<h1>
					{host}
					<small>A private npm registry, running {PRODUCT_NAME}.</small>
				</h1>
				<p>
					Packages published here are available to npm, pnpm and yarn with a registry token. Packages that are not
					published here are fetched from the public npm registry, so this registry can be used for everything.
				</p>
				<nav>
					<a href="/_/admin">Admin area</a>
					<a href="/_/docs">API reference</a>
					{docsUrl ? <a href={docsUrl}>{PRODUCT_NAME} documentation</a> : null}
				</nav>

				<h2>Install packages</h2>
				<p>
					Add the registry and your token to the <code>.npmrc</code> of your project (or of your home directory). Keep
					the token out of version control, for instance by reading it from an environment variable:
				</p>
				<CodeBlock lang="npmrc" code={`@acme:registry=${origin}/\n//${host}/:_authToken=\${REGISTRY_TOKEN}`} />
				<p>
					The first line sends every <code>@acme</code> package to this registry; repeat it for each scope you use. To
					resolve <em>all</em> packages through this registry instead, replace it with <code>registry={origin}/</code>.
				</p>
				<CodeBlock lang="bash" code={"npm install @acme/my-package\npnpm add @acme/my-package"} />

				<h2>Publish packages</h2>
				<p>
					Point the package at this registry with <code>publishConfig</code>, so that nobody publishes it to the public
					registry by accident:
				</p>
				<CodeBlock
					lang="json"
					code={`{\n  "name": "@acme/my-package",\n  "version": "1.0.0",\n  "publishConfig": {\n    "registry": "${origin}/"\n  }\n}`}
				/>
				<p>
					With the <code>.npmrc</code> above in place, publish as usual. The token needs write access to the package. A
					version can only be published once: bump the version to publish again.
				</p>
				<CodeBlock lang="bash" code={"npm publish\npnpm publish"} />

				<h2>Tokens</h2>
				<p>
					Tokens are created by the administrators of this registry, in the <a href="/_/admin/tokens">admin area</a>.
					Ask for one with the scopes you need:
				</p>
				<table>
					<thead>
						<tr>
							<th>Scope</th>
							<th>Allows</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<code>package:read</code>
							</td>
							<td>Installing the listed packages</td>
						</tr>
						<tr>
							<td>
								<code>package:write</code>
							</td>
							<td>Publishing the listed packages</td>
						</tr>
						<tr>
							<td>
								<code>package:read+write</code>
							</td>
							<td>Both</td>
						</tr>
					</tbody>
				</table>
				<p class="muted">
					Each scope applies either to every package (<code>*</code>) or to a list of package names, such as{" "}
					<code>@acme/my-package</code>. Keep installation and publishing tokens separate when you can: CI only needs
					read access, and only the release job needs to write.
				</p>
			</main>
		</body>
	</html>
);

export const renderUsagePage = (props: UsagePageProps) => html`<!DOCTYPE html>${<UsagePage {...props} />}`;
