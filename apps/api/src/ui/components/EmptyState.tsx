import type { FC } from "hono/jsx";

interface EmptyStateProps {
	title?: string;
	description?: string;
	action?: {
		label: string;
		href: string;
	};
}

export const EmptyState: FC<EmptyStateProps> = ({
	title = "No packages found",
	description = "There are no packages in the registry yet.",
	action
}) => {
	return (
		<div class="flex flex-col items-center justify-center py-24 px-4 text-center">
			<div class="w-16 h-16 mb-6 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
				<svg class="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
					<title>Box icon</title>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
					/>
				</svg>
			</div>
			<h2 class="text-xl font-semibold tracking-tight text-(--text-primary) mb-2">{title}</h2>
			<p class="text-sm text-(--text-secondary) max-w-md mb-6">{description}</p>
			{action && (
				<a
					href={action.href}
					class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200"
				>
					{action.label}
				</a>
			)}
		</div>
	);
};
