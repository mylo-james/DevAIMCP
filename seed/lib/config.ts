export interface DatabaseConfig {
	connectionString: string;
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
	const url = env.DATABASE_URL;
	if (url && url.trim().length > 0) {
		return { connectionString: url };
	}
	const host = env.DB_HOST;
	const port = env.DB_PORT || '5432';
	const name = env.DB_NAME;
	const user = env.DB_USER;
	const password = env.DB_PASSWORD;
	if (host && name && user && password) {
		const cs = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
		return { connectionString: cs };
	}
	throw new Error('Database configuration missing: set DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD');
}