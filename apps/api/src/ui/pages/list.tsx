import type { FC } from "hono/jsx";
import { EmptyState } from "../components/EmptyState";
import { PackageCard } from "../components/PackageCard";

interface ListPageProps {
	packages: Array<{
		name: string;
		latestVersion: string;
		description: string;
		license: string;
		releaseCount: number;
		createdAt: number;
		updatedAt: number;
	}>;
}

export const ListPage: FC<ListPageProps> = ({ packages }) => {
	if (packages.length === 0) {
		return (
			<EmptyState
				title="No packages yet"
				description="Your registry is empty. Publish your first package using the CLI to see it here."
			/>
		);
	}

	return (
		<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div class="mb-10">
				<h1 class="text-3xl md:text-4xl font-bold tracking-tighter text-[var(--text-primary)] mb-2">Packages</h1>
				<p class="text-base text-[var(--text-secondary)]">
					{packages.length} {packages.length === 1 ? "package" : "packages"} in the registry
				</p>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{packages.map((pkg, index) => (
					<PackageCard
						key={pkg.name}
						name={pkg.name}
						latestVersion={pkg.latestVersion}
						description={pkg.description}
						license={pkg.license}
						releaseCount={pkg.releaseCount}
						updatedAt={pkg.updatedAt}
						index={index}
					/>
				))}
			</div>
		</div>
	);
};
