import { Hono } from "hono";
import { packageService } from "#services/package-service";
import { Layout } from "./layout";
import { DetailPage } from "./pages/detail";
import { ListPage } from "./pages/list";

export const uiRouter = new Hono();

uiRouter.get("/packages", async (c) => {
	const packages = await packageService.listPackages();

	return c.html(
		<Layout title="Packages | npflared registry">
			<ListPage packages={packages} />
		</Layout>
	);
});

uiRouter.get("/packages/:packageName", async (c) => {
	const packageName = c.req.param("packageName");
	const pkg = await packageService.getPackage(packageName);

	if (!pkg) {
		return c.notFound();
	}

	const distTagKeys = Object.keys(pkg["dist-tags"]);
	const latestTag =
		pkg["dist-tags"].latest ?? (distTagKeys.length > 0 ? pkg["dist-tags"][distTagKeys[0]!] : undefined) ?? "unknown";
	const latestVersionData =
		typeof pkg.versions === "object" && pkg.versions !== null
			? (pkg.versions as Record<string, unknown>)[latestTag]
			: undefined;

	const readme =
		typeof latestVersionData === "object" &&
		latestVersionData !== null &&
		"readme" in latestVersionData &&
		typeof latestVersionData.readme === "string"
			? latestVersionData.readme
			: undefined;

	const license =
		(typeof latestVersionData === "object" &&
			latestVersionData !== null &&
			"license" in latestVersionData &&
			typeof latestVersionData.license === "string" &&
			latestVersionData.license) ||
		"Unknown";

	const versions =
		typeof pkg.versions === "object" && pkg.versions !== null
			? Object.entries(pkg.versions as Record<string, unknown>).map(([version, manifest]) => ({
					version,
					tag: "latest", // simplified
					createdAt: Date.now(), // we don't have per-version dates in this format
					manifest
				}))
			: [];

	// Build time from the time field if available
	const timeMap = typeof pkg.time === "object" && pkg.time !== null ? (pkg.time as Record<string, string>) : {};

	const versionsWithDates = versions.map((v) => ({
		...v,
		createdAt: timeMap[v.version] !== undefined ? new Date(timeMap[v.version] as string).getTime() : Date.now()
	}));

	return c.html(
		<Layout title={`${pkg.name} | npflared registry`}>
			<DetailPage
				name={pkg.name}
				latestVersion={latestTag}
				readme={readme}
				license={license}
				releaseCount={versions.length}
				createdAt={timeMap.created ? new Date(timeMap.created).getTime() : Date.now()}
				updatedAt={timeMap.modified ? new Date(timeMap.modified).getTime() : Date.now()}
				distTags={pkg["dist-tags"]}
				versions={versionsWithDates}
			/>
		</Layout>
	);
});
