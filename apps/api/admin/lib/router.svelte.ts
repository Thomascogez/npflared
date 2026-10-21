/**
 * A minimal history router: the app only has a handful of pages and is served
 * under a base path by the registry worker, which rewrites deep links to the shell.
 */
const base = "/_/admin";

const currentHref = () => {
	const path = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname;
	return `${path || "/"}${location.search}`;
};

class Router {
	/** Path and query of the current page, relative to the base path. */
	href = $state(currentHref());
	path = $derived(this.href.split("?")[0] || "/");
	query = $derived(new URLSearchParams(this.href.split("?")[1] ?? ""));

	constructor() {
		window.addEventListener("popstate", () => {
			this.href = currentHref();
		});
	}

	navigate(to: string, options: { replace?: boolean } = {}) {
		history[options.replace ? "replaceState" : "pushState"](null, "", base + to);
		this.href = to;
	}

	/** Turns an app path into the URL to put in a link. */
	resolve(to: string) {
		return base + to;
	}
}

export const router = new Router();

/** Lets plain clicks on in-app links go through the router instead of reloading the page. */
export const handleLinkClick = (event: MouseEvent) => {
	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey
	) {
		return;
	}

	const anchor = event.target instanceof Element ? event.target.closest("a") : null;

	if (!anchor || anchor.target || anchor.hasAttribute("download") || anchor.origin !== location.origin) {
		return;
	}

	const href = anchor.pathname + anchor.search;

	if (!href.startsWith(`${base}/`)) {
		return;
	}

	event.preventDefault();
	router.navigate(href.slice(base.length));
};
