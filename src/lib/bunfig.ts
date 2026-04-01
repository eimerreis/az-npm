import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parse, stringify } from "smol-toml";

import type { CredentialWriterOptions } from "./auth.ts";

type BunfigDocument = {
	install?: {
		scopes?: Record<string, BunfigScopeConfig>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

type BunfigScopeConfig = {
	token: string;
	url: string;
	[key: string]: unknown;
};

export class WriteBunfigCredentialsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WriteBunfigCredentialsError";
	}
}

export async function writeBunfigCredentials(
	options: CredentialWriterOptions,
): Promise<{ filePath: string }> {
	const unsupportedFeeds = options.feeds.filter((feed) => feed.scopes.length === 0);
	if (unsupportedFeeds.length > 0) {
		throw new WriteBunfigCredentialsError(
			"Could not write Bun credentials for unscoped Azure DevOps feeds. Bun auth currently requires at least one scoped registry.",
		);
	}

	const filePath = join(getHomeDirectory(), ".bunfig.toml");
	const document = await readBunfig(filePath);
	const existingInstall = document.install ?? {};
	const existingScopes = existingInstall.scopes ?? {};

	const nextScopes = { ...existingScopes };
	for (const feed of options.feeds) {
		for (const scope of feed.scopes) {
			nextScopes[scope] = {
				token: options.token,
				url: feed.registryUrl,
			};
		}
	}

	const nextDocument: BunfigDocument = {
		...document,
		install: {
			...existingInstall,
			scopes: nextScopes,
		},
	};

	await mkdir(dirname(filePath), { recursive: true });
	await writeFile(filePath, stringify(nextDocument), "utf8");

	return { filePath };
}

async function readBunfig(filePath: string): Promise<BunfigDocument> {
	try {
		const contents = await readFile(filePath, "utf8");
		return parse(contents) as BunfigDocument;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return {};
		}

		throw error;
	}
}

function getHomeDirectory(): string {
	return process.env.HOME ?? process.env.USERPROFILE ?? "~";
}
