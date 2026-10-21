interface AppEnv {
	Bindings: Env;
	Variables: {
		token: import("./src/services/token-service").PublicToken | undefined;
		admin: import("./src/admin-auth/provider").AdminIdentity | undefined;
	};
}

/** Vite's raw imports, used to inline stylesheets into server-rendered pages. */
declare module "*?raw" {
	const content: string;
	export default content;
}
