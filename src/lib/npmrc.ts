import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parse, stringify } from "ini";

import type { CredentialWriterOptions } from "./auth.ts";

export async function writeNpmrcCredentials(
	options: CredentialWriterOptions,
): Promise<{ filePath: string }> {
	const filePath = join(getHomeDirectory(), ".npmrc");
	const existing = await readIniFile(filePath);
	const nextConfig = {
		...existing,
		...buildAuthEntries(options),
	};

	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, stringify(nextConfig), "utf8");

	return { filePath };
}

async function readIniFile(filePath: string): Promise<Record<string, string>> {
	try {
		const contents = await readFile(filePath, "utf8");
		return parse(contents) as Record<string, string>;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return {};
		}

		throw error;
	}
}

function buildAuthEntries(options: CredentialWriterOptions): Record<string, string> {
	const entries: Record<string, string> = {};

	for (const feed of options.feeds) {
		for (const key of getAuthTokenKeys(feed.registryUrl)) {
			entries[key] = options.token;
		}
	}

	return entries;
}

function getAuthTokenKeys(registryUrl: string): string[] {
	const match = /https?:(.*)registry\/?$/i.exec(registryUrl);
	if (!match?.[1]) {
		throw new Error(`Could not derive npm auth token keys from registry URL: ${registryUrl}`);
	}

	const identifier = match[1];
	return [`${identifier}:_authToken`, `${identifier}registry/:_authToken`];
}

function getHomeDirectory(): string {
	return process.env.HOME ?? process.env.USERPROFILE ?? "~";
}
