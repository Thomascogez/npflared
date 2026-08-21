import type { FC } from "hono/jsx";

export interface LayoutProps {
	children: ReturnType<FC>;
	title?: string;
}

const DarkModeScript = `
  (function() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
`;

export const Layout: FC<LayoutProps> = ({ children, title = "npflared registry" }) => {
	return (
		<html lang="en" data-theme="light">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{title}</title>
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
				<link
					href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
					rel="stylesheet"
				/>
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
				/>
				<script dangerouslySetInnerHTML={{ __html: DarkModeScript }} />
				<link rel="stylesheet" href="/styles.css" />
			</head>
			<body class="min-h-[100dvh] flex flex-col antialiased">
				<nav class="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/80 backdrop-blur-xl">
					<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
						<a href="/ui/packages" class="flex items-center gap-2.5 group">
							<div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
								<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
									/>
								</svg>
							</div>
							<span class="text-lg font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors duration-200">
								npflared
							</span>
						</a>
						<button
							type="button"
							id="theme-toggle"
							class="relative p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200"
							aria-label="Toggle dark mode"
						>
							<svg
								id="theme-icon-moon"
								class="w-5 h-5 text-[var(--text-secondary)]"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="1.5"
							>
								<title>Moon icon</title>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
								/>
							</svg>
							<svg
								id="theme-icon-sun"
								class="w-5 h-5 text-[var(--text-secondary)] hidden"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="1.5"
							>
								<title>Sun icon</title>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
								/>
							</svg>
						</button>
					</div>
				</nav>
				<main class="flex-1">{children}</main>
				<footer class="border-t border-[var(--border-color)] py-10 mt-auto bg-[var(--bg-surface)]">
					<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
						<div class="flex items-center gap-2.5">
							<div class="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
								<svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
									/>
								</svg>
							</div>
							<span class="text-sm font-medium text-(--text-primary)">npflared</span>
						</div>
						<div class="flex items-center gap-2.5">
							<a
								href="https://github.com/Thomascogez/npflared"
								target="_blank"
								class="text-sm text-(--text-primary)"
								rel="noopener"
							>
								Github
							</a>
							<a
								href="https://npflared.thomas-cogez.fr/guide/"
								target="_blank"
								class="text-sm text-(--text-muted)"
								rel="noopener"
							>
								Documentation
							</a>
						</div>
					</div>
				</footer>
				<script
					dangerouslySetInnerHTML={{
						__html: `
            (function() {
              const toggle = document.getElementById('theme-toggle');
              const moonIcon = document.getElementById('theme-icon-moon');
              const sunIcon = document.getElementById('theme-icon-sun');
              const html = document.documentElement;
              
              function updateIcons() {
                const isDark = html.getAttribute('data-theme') === 'dark';
                if (isDark) {
                  moonIcon.classList.add('hidden');
                  sunIcon.classList.remove('hidden');
                } else {
                  moonIcon.classList.remove('hidden');
                  sunIcon.classList.add('hidden');
                }
              }
              
              updateIcons();
              
              toggle.addEventListener('click', function() {
                const isDark = html.getAttribute('data-theme') === 'dark';
                const newTheme = isDark ? 'light' : 'dark';
                html.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateIcons();
              });
            })();
          `
					}}
				/>
			</body>
		</html>
	);
};
