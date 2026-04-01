import { describe, expect, mock, test } from "bun:test";

import { authenticate } from "./auth.ts";

describe("authenticate", () => {
	test("orchestrates npm auth flow with the npmrc writer", async () => {
		const detectPackageManager = mock(async () => "npm" as const);
		const discoverFeeds = mock(async () => [
			{
				feed: "shared",
				organization: "acme",
				project: "web",
				registryUrl: "https://pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/",
				scopes: ["@acme"],
				urlType: "azure-devops" as const,
			},
		]);
		const resolveToken = mock(async () => ({ source: "azure-cli" as const, token: "token" }));
		const writeNpmrcCredentials = mock(async () => ({ filePath: "/Users/test/.npmrc" }));

		const result = await authenticate({
			cwd: "/workspace/project",
			dependencies: {
				detectPackageManager,
				discoverFeeds,
				resolveToken,
				writeNpmrcCredentials,
			},
		});

		expect(result).toEqual({
			filePath: "/Users/test/.npmrc",
			feeds: [
				{
					feed: "shared",
					organization: "acme",
					project: "web",
					registryUrl: "https://pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/",
					scopes: ["@acme"],
					urlType: "azure-devops",
				},
			],
			message: "Authenticated 1 Azure DevOps feed for npm using azure-cli.",
			ok: true,
			packageManager: "npm",
			tokenSource: "azure-cli",
		});
		expect(writeNpmrcCredentials).toHaveBeenCalledWith({
			cwd: "/workspace/project",
			feeds: [
				{
					feed: "shared",
					organization: "acme",
					project: "web",
					registryUrl: "https://pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/",
					scopes: ["@acme"],
					urlType: "azure-devops",
				},
			],
			packageManager: "npm",
			token: "token",
			tokenSource: "azure-cli",
		});
	});

	test("uses the bun writer for bun projects", async () => {
		const writeBunfigCredentials = mock(async () => ({ filePath: "/Users/test/.bunfig.toml" }));
		const writeNpmrcCredentials = mock(async () => ({ filePath: "/Users/test/.npmrc" }));
		const discoverFeeds = mock(async (options?: { packageManager?: string }) => {
			expect(options?.packageManager).toBe("bun");
			return [
				{
					feed: "shared",
					organization: "acme",
					project: undefined,
					registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/shared/npm/registry/",
					scopes: ["@acme"],
					urlType: "visualstudio" as const,
				},
			];
		});

		const result = await authenticate({
			dependencies: {
				detectPackageManager: async () => "bun",
				discoverFeeds,
				resolveToken: async () => ({ source: "env", token: "token" }),
				writeBunfigCredentials,
				writeNpmrcCredentials,
			},
		});

		expect(result.ok).toBe(true);
		expect(writeBunfigCredentials).toHaveBeenCalledTimes(1);
		expect(writeNpmrcCredentials).not.toHaveBeenCalled();
	});

	test("returns a detect failure before later steps", async () => {
		const discoverFeeds = mock(async () => []);

		const result = await authenticate({
			dependencies: {
				detectPackageManager: async () => {
					throw new Error("missing lockfile");
				},
				discoverFeeds,
			},
		});

		expect(result).toEqual({
			code: "detect_failed",
			message: "missing lockfile",
			ok: false,
		});
		expect(discoverFeeds).not.toHaveBeenCalled();
	});

	test("returns a token failure when token resolution fails", async () => {
		const result = await authenticate({
			dependencies: {
				detectPackageManager: async () => "pnpm",
				discoverFeeds: async () => [
					{
						feed: "shared",
						organization: "acme",
						project: undefined,
						registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/shared/npm/registry/",
						scopes: ["@acme"],
						urlType: "visualstudio",
					},
				],
				resolveToken: async () => {
					throw new Error("az not logged in");
				},
			},
		});

		expect(result).toEqual({
			code: "token_failed",
			message: "az not logged in",
			ok: false,
		});
	});

	test("returns a write failure when the selected writer throws", async () => {
		const result = await authenticate({
			dependencies: {
				detectPackageManager: async () => "npm",
				discoverFeeds: async () => [
					{
						feed: "shared",
						organization: "acme",
						project: undefined,
						registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/shared/npm/registry/",
						scopes: ["@acme"],
						urlType: "visualstudio",
					},
				],
				resolveToken: async () => ({ source: "explicit", token: "token" }),
				writeNpmrcCredentials: async () => {
					throw new Error("write not implemented");
				},
			},
			token: "token",
		});

		expect(result).toEqual({
			code: "write_failed",
			message: "write not implemented",
			ok: false,
		});
	});
});
