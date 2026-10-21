import DOMPurify from "dompurify";
import { marked } from "marked";

/** Renders a readme to HTML that is safe to inject: whatever a publisher wrote goes through the sanitiser. */
export const renderMarkdown = (markdown: string) =>
	DOMPurify.sanitize(marked.parse(markdown, { async: false }), { USE_PROFILES: { html: true } });
