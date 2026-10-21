import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";

// Follow the system colour scheme: the shadcn-svelte theme reads it from the `dark` class.
const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
const applyColorScheme = () => document.documentElement.classList.toggle("dark", colorScheme.matches);
applyColorScheme();
colorScheme.addEventListener("change", applyColorScheme);

const target = document.getElementById("app");

if (!target) {
	throw new Error("Missing #app element");
}

export default mount(App, { target });
