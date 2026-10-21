interface AppEnv {
	Bindings: Env;
	Variables: {
		token: import("./src/services/token-service").PublicToken | undefined;
		admin: import("./src/admin-auth/provider").AdminIdentity | undefined;
	};
}
