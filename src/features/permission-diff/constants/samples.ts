export const SAMPLE_GROUP_1_JSON = JSON.stringify(
	[
		{
			name: "Merchant Admin",
			permissions: [
				{ type: "permission", action: "GET", resource: "/api/v1/orders" },
				{ type: "permission", action: "POST", resource: "/api/v1/orders" },
				{ type: "tenant", resource: "mch" },
			],
		},
		{
			name: "Merchant Viewer",
			permissions: [
				{ type: "permission", action: "GET", resource: "/api/v1/orders" },
				{ type: "permission", action: "GET", resource: "/api/v1/reports" },
			],
		},
	],
	null,
	2
);

export const SAMPLE_GROUP_2_JSON = JSON.stringify(
	[
		{
			name: "Ops Admin",
			permissions: [
				{ type: "permission", action: "GET", resource: "/api/v1/orders" },
				{ type: "tenant", resource: "mch" },
				{ type: "market", resource: "vn" },
			],
		},
	],
	null,
	2
);
