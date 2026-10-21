import * as path from "node:path";
import { defineConfig } from "@rspress/core";

export default defineConfig({
	root: path.join(__dirname, "docs"),
	globalStyles: path.join(__dirname, "styles/index.css"),
	title: "Firestash",
	themeConfig: {
		socialLinks: [
			{
				icon: "github",
				mode: "link",
				content: "https://github.com/colinbate/firestash"
			}
		]
	},
	markdown: {
		showLineNumbers: true,
		defaultWrapCode: true
	}
});
