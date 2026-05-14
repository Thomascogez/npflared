import hljs from "highlight.js";
import type { FC } from "hono/jsx";
import { marked } from "marked";

interface MarkdownRendererProps {
	content: string;
}

const renderer = new marked.Renderer();

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
	const language = lang || "plaintext";
	let highlighted = text;

	if (lang && hljs.getLanguage(lang)) {
		highlighted = hljs.highlight(text, { language: lang }).value;
	} else {
		highlighted = hljs.highlightAuto(text).value;
	}

	return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.use({ renderer });

export const MarkdownRenderer: FC<MarkdownRendererProps> = ({ content }) => {
	const html = marked.parse(content, { async: false, gfm: true });

	return (
		<div
			class="prose prose-zinc dark:prose-invert max-w-none
				prose-headings:tracking-tight prose-headings:font-semibold
				prose-pre:bg-[var(--bg-code)] prose-pre:text-zinc-100 prose-pre:rounded-xl prose-pre:p-6 prose-pre:overflow-x-auto
				prose-code:text-emerald-600 prose-code:bg-emerald-50 dark:prose-code:bg-emerald-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
				prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
				prose-img:rounded-xl
				prose-table:border-collapse prose-table:w-full
				prose-th:border prose-th:border-[var(--border-color)] prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-sm prose-th:font-semibold
				prose-td:border prose-td:border-[var(--border-color)] prose-td:px-4 prose-td:py-2 prose-td:text-sm"
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
};
