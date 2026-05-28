const SWAGGER_URL_CONFIG_KEY = "swagger-minifier-url-config";

type SwaggerUrlConfig = {
	url: string;
	username: string;
	password: string;
};

export function readStoredSwaggerUrlConfig(): SwaggerUrlConfig | null {
	if (typeof window === "undefined") return null;
	try {
		const raw = localStorage.getItem(SWAGGER_URL_CONFIG_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as SwaggerUrlConfig;
	} catch {
		return null;
	}
}

export function writeSwaggerUrlConfigToStorage(config: SwaggerUrlConfig): void {
	try {
		localStorage.setItem(SWAGGER_URL_CONFIG_KEY, JSON.stringify(config));
	} catch {
		// storage full or unavailable
	}
}
