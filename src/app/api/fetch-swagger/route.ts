import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	let body: { url?: string; username?: string; password?: string };

	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		);
	}

	const { url, username, password } = body;

	if (!url || typeof url !== "string" || !url.trim()) {
		return NextResponse.json(
			{ error: "Swagger URL is required." },
			{ status: 400 },
		);
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		return NextResponse.json(
			{ error: "Invalid URL format." },
			{ status: 400 },
		);
	}

	if (!["http:", "https:"].includes(parsedUrl.protocol)) {
		return NextResponse.json(
			{ error: "Only HTTP and HTTPS URLs are supported." },
			{ status: 400 },
		);
	}

	// fetch() rejects URLs containing credentials. Extract Basic auth values and
	// remove them from the URL before constructing the upstream request.
	const embeddedUsername = decodeURIComponent(parsedUrl.username);
	const embeddedPassword = decodeURIComponent(parsedUrl.password);
	parsedUrl.username = "";
	parsedUrl.password = "";

	const hasExplicitCredentials = Boolean(username || password);
	const effectiveUsername = hasExplicitCredentials
		? (username ?? "")
		: embeddedUsername;
	const effectivePassword = hasExplicitCredentials
		? (password ?? "")
		: embeddedPassword;

	const headers: HeadersInit = {
		Accept: "application/json,text/plain,*/*",
	};

	if (effectiveUsername || effectivePassword) {
		const credentials = `${effectiveUsername}:${effectivePassword}`;
		const encoded = Buffer.from(credentials, "utf-8").toString("base64");
		headers.Authorization = `Basic ${encoded}`;
	}

	try {
		const response = await fetch(parsedUrl.toString(), {
			method: "GET",
			headers,
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Upstream returned ${response.status} ${response.statusText}.` },
				{ status: 502 },
			);
		}

		const raw = await response.text();

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return NextResponse.json(
				{ error: "URL did not return valid JSON." },
				{ status: 422 },
			);
		}

		return NextResponse.json({ data: parsed });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch from URL.";
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
