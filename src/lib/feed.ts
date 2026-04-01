import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { parse as parseIni } from "ini";
import { parse as parseToml } from "smol-toml";

import type { PackageManager } from "./detect.ts";

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
	packageManager?: PackageManager;
};

type BunfigDocument = {
	install?: {
		registry?: BunfigRegistryValue;
		scopes?: Record<string, BunfigRegistryValue>;
		[key: string]: unknown;
	};
	[key: string]: unknown;
};

type BunfigRegistryValue =
	| string
	| {
			url?: unknown;
			[key: string]: unknown;
	  };

export class DiscoverFeedsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DiscoverFeedsError";
	}
}

export async function discoverFeeds(options: DiscoverFeedsOptions = {}): Promise<AzureFeed[]> {
	const cwd = options.cwd ?? process.cwd();

	if (options.packageManager === "bun") {
		const bunfigPath = join(cwd, "bunfig.toml");
		const bunfigContents = await readOptionalFile(bunfigPath);
		if (bunfigContents !== null) {
			const bunfigFeeds = discoverFeedsFromBunfigContents(bunfigContents);
			if (bunfigFeeds.length > 0) {
				return bunfigFeeds;
			}
		}

		const npmrcPath = join(cwd, ".npmrc");
		const npmrcContents = await readOptionalFile(npmrcPath);
		if (npmrcContents !== null) {
			const npmrcFeeds = discoverFeedsFromNpmrcContents(npmrcContents);
			if (npmrcFeeds.length > 0) {
				return npmrcFeeds;
			}
		}

		throw new DiscoverFeedsError(
			`Could not find an Azure DevOps registry in project bunfig.toml or .npmrc in ${cwd}.`,
		);
	}

	const filePath = join(cwd, ".npmrc");
	const fileContents = await readProjectNpmrc(filePath);
	const feeds = discoverFeedsFromNpmrcContents(fileContents);
	if (feeds.length > 0) {
		return feeds;
	}

	throw new DiscoverFeedsError(`Could not find an Azure DevOps npm registry in ${filePath}.`);
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

async function readOptionalFile(filePath: string): Promise<string | null> {
	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return null;
		}

		throw error;
	}
}

function discoverFeedsFromNpmrcContents(fileContents: string): AzureFeed[] {
	const parsed = parseIni(fileContents) as Record<string, unknown>;
	const registryScopes = new Map<string, Set<string>>();

	for (const [key, value] of Object.entries(parsed)) {
		const scope = extractScope(key);
		collectRegistryCandidates(registryScopes, key, scope);
		if (typeof value === "string") {
			collectRegistryCandidates(registryScopes, value, scope);
		}
	}

	return parseFeeds(registryScopes);
}

function discoverFeedsFromBunfigContents(fileContents: string): AzureFeed[] {
	const document = parseToml(fileContents) as BunfigDocument;
	const registryScopes = new Map<string, Set<string>>();
	const install = document.install;

	collectRegistryCandidates(registryScopes, getBunfigRegistryUrl(install?.registry), null);

	for (const [scope, value] of Object.entries(install?.scopes ?? {})) {
		collectRegistryCandidates(registryScopes, getBunfigRegistryUrl(value), scope);
	}

	return parseFeeds(registryScopes);
}

function collectRegistryCandidates(
	registryScopes: Map<string, Set<string>>,
	input: string | null,
	scope: string | null,
): void {
	if (!input) {
		return;
	}

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

function parseFeeds(registryScopes: Map<string, Set<string>>): AzureFeed[] {
	return [...registryScopes.entries()]
		.map(([candidate, scopes]) => parseAzureFeed(candidate, [...scopes]))
		.filter((feed): feed is AzureFeed => feed !== null);
}

function parseAzureFeed(registryUrl: string, scopes: string[]): AzureFeed | null {
	const devAzureMatch = registryUrl.match(DEV_AZURE_PATTERN);
	if (devAzureMatch?.groups) {
		const feed = devAzureMatch.groups.feed;
		const organization = devAzureMatch.groups.organization;
		if (!feed || !organization) {
			return null;
		}

		return {
			feed,
			organization,
			project: devAzureMatch.groups.project,
			registryUrl,
			scopes,
			urlType: "azure-devops",
		};
	}

	const visualStudioMatch = registryUrl.match(VISUAL_STUDIO_PATTERN);
	if (visualStudioMatch?.groups) {
		const feed = visualStudioMatch.groups.feed;
		const organization = visualStudioMatch.groups.organization;
		if (!feed || !organization) {
			return null;
		}

		return {
			feed,
			organization,
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

function getBunfigRegistryUrl(value: BunfigRegistryValue | undefined): string | null {
	if (typeof value === "string") {
		return value;
	}

	if (value && typeof value === "object" && typeof value.url === "string") {
		return value.url;
	}

	return null;
}

function extractScope(key: string): string | null {
	const match = key.match(/^(?<scope>@[^:]+):registry$/i);
	return match?.groups?.scope ?? null;
}
