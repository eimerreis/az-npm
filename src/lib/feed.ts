import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse } from "ini";

const REGISTRY_PATTERNS = [
	/(?<registry>(?:https?:)?\/\/pkgs\.dev\.azure\.com\/[^/\s]+(?:\/[^/\s]+)?\/_packaging\/[^/\s]+\/npm\/registry\/?)/gi,
	/(?<registry>(?:https?:)?\/\/[^/.\s]+\.pkgs\.visualstudio\.com(?:\/[^/\s]+)?\/_packaging\/[^/\s]+\/npm\/registry\/?)/gi,
] as const;

const DEV_AZURE_PATTERN =
	/^https:\/\/pkgs\.dev\.azure\.com\/(?<organization>[^/]+)(?:\/(?<project>[^/]+))?\/_packaging\/(?<feed>[^/]+)\/npm\/registry\/?$/i;
const VISUAL_STUDIO_PATTERN =
	/^https:\/\/(?<organization>[^/.]+)\.pkgs\.visualstudio\.com(?:\/(?<project>[^/]+))?\/_packaging\/(?<feed>[^/]+)\/npm\/registry\/?$/i;

export type AzureFeed = {
	feed: string;
	organization: string;
	project?: string;
	registryUrl: string;
	scopes: string[];
	urlType: "azure-devops" | "visualstudio";
};

export type DiscoverFeedsOptions = {
	cwd?: string;
	fileContents?: string;
	filePath?: string;
};

export class DiscoverFeedsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DiscoverFeedsError";
	}
}

export async function discoverFeeds(options: DiscoverFeedsOptions = {}): Promise<AzureFeed[]> {
	const filePath = options.filePath ?? join(options.cwd ?? process.cwd(), ".npmrc");
	const fileContents = options.fileContents ?? (await readProjectNpmrc(filePath));
	const parsed = parse(fileContents) as Record<string, unknown>;
	const registryScopes = new Map<string, Set<string>>();

	for (const [key, value] of Object.entries(parsed)) {
		collectCandidates(registryScopes, key, key);
		if (typeof value === "string") {
			collectCandidates(registryScopes, value, key);
		}
	}

	const feeds = [...registryScopes.entries()]
		.map(([candidate, scopes]) => parseAzureFeed(candidate, [...scopes]))
		.filter((feed) => feed !== null);

	if (feeds.length === 0) {
		throw new DiscoverFeedsError(`Could not find an Azure DevOps npm registry in ${filePath}.`);
	}

	return feeds;
}

async function readProjectNpmrc(filePath: string): Promise<string> {
	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new DiscoverFeedsError(`Could not find project .npmrc at ${filePath}.`);
		}

		throw error;
	}
}

function collectCandidates(
	registryScopes: Map<string, Set<string>>,
	input: string,
	key: string,
): void {
	const scope = extractScope(key);

	for (const pattern of REGISTRY_PATTERNS) {
		for (const match of input.matchAll(pattern)) {
			const registry = match.groups?.registry;
			if (registry) {
				const normalizedRegistry = normalizeRegistryUrl(registry);
				const scopes = registryScopes.get(normalizedRegistry) ?? new Set<string>();
				if (scope) {
					scopes.add(scope);
				}

				registryScopes.set(normalizedRegistry, scopes);
			}
		}
	}
}

function parseAzureFeed(registryUrl: string, scopes: string[]): AzureFeed | null {
	const devAzureMatch = registryUrl.match(DEV_AZURE_PATTERN);
	if (devAzureMatch?.groups) {
		return {
			feed: devAzureMatch.groups.feed,
			organization: devAzureMatch.groups.organization,
			project: devAzureMatch.groups.project,
			registryUrl,
			scopes,
			urlType: "azure-devops",
		};
	}

	const visualStudioMatch = registryUrl.match(VISUAL_STUDIO_PATTERN);
	if (visualStudioMatch?.groups) {
		return {
			feed: visualStudioMatch.groups.feed,
			organization: visualStudioMatch.groups.organization,
			project: visualStudioMatch.groups.project,
			registryUrl,
			scopes,
			urlType: "visualstudio",
		};
	}

	return null;
}

function normalizeRegistryUrl(value: string): string {
	const withProtocol = value.startsWith("//") ? `https:${value}` : value;
	return withProtocol.endsWith("/") ? withProtocol : `${withProtocol}/`;
}

function extractScope(key: string): string | null {
	const match = key.match(/^(?<scope>@[^:]+):registry$/i);
	return match?.groups?.scope ?? null;
}
