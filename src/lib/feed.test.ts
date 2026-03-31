import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DiscoverFeedsError, discoverFeeds } from "./feed.ts";

const createdDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		createdDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("discoverFeeds", () => {
	test("parses Azure DevOps registry URLs from project .npmrc values", async () => {
		const cwd = await createProject(
			"@acme:registry=https://pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/\n",
		);

		expect(await discoverFeeds({ cwd })).toEqual([
			{
				feed: "shared",
				organization: "acme",
				project: "web",
				registryUrl: "https://pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/",
				scopes: ["@acme"],
				urlType: "azure-devops",
			},
		]);
	});

	test("parses legacy visualstudio registry URLs from auth keys and de-duplicates them", async () => {
		const cwd = await createProject(`
@acme:registry=https://acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/
//acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/:_authToken=fake
`);

		expect(await discoverFeeds({ cwd })).toEqual([
			{
				feed: "tooling",
				organization: "acme",
				project: undefined,
				registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/",
				scopes: ["@acme"],
				urlType: "visualstudio",
			},
		]);
	});

	test("returns an empty scopes list when the registry is only found in auth keys", async () => {
		const cwd = await createProject(
			"//acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/:_authToken=fake\n",
		);

		expect(await discoverFeeds({ cwd })).toEqual([
			{
				feed: "tooling",
				organization: "acme",
				project: undefined,
				registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/",
				scopes: [],
				urlType: "visualstudio",
			},
		]);
	});

	test("throws a typed error when no Azure DevOps registry is configured", async () => {
		const cwd = await createProject("registry=https://registry.npmjs.org/\n");

		await expect(discoverFeeds({ cwd })).rejects.toBeInstanceOf(DiscoverFeedsError);
	});

	test("throws a typed error when project .npmrc is missing", async () => {
		const cwd = await createEmptyProject();

		await expect(discoverFeeds({ cwd })).rejects.toBeInstanceOf(DiscoverFeedsError);
	});
});

async function createProject(npmrcContents: string): Promise<string> {
	const directory = await createEmptyProject();
	await writeFile(join(directory, ".npmrc"), npmrcContents.trimStart(), "utf8");
	return directory;
}

async function createEmptyProject(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "az-npm-auth-feed-"));
	createdDirectories.push(directory);
	return directory;
}
