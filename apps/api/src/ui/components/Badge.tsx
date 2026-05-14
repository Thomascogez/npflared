import type { FC } from "hono/jsx";

interface BadgeProps {
	children: string;
	variant?: "default" | "latest" | "beta" | "alpha";
}

const variantClasses: Record<string, string> = {
	default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
	latest: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
	beta: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
	alpha: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
};

export const Badge: FC<BadgeProps> = ({ children, variant = "default" }) => {
	return (
		<span
			class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant] ?? variantClasses.default}`}
		>
			{children}
		</span>
	);
};
