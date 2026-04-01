import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const createdDirectories: string[] = [];

afterEach(async () => {
	delete process.env.HOME;
	await Promise.all(
		createdDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("writeBunfigCredentials", () => {
	test("writes scoped token auth into the global bunfig and preserves existing install config", async () => {
		const homeDirectory = await createHomeDirectory();
		process.env.HOME = homeDirectory;
		const filePath = join(homeDirectory, ".bunfig.toml");
		await Bun.write(
			filePath,
			'[install]\nfrozenLockfile = true\n\n[install.scopes]\n"@old" = { token = "old", url = "https://example.com/" }\n',
		);

		const { writeBunfigCredentials } = await import("./bunfig.ts");
		const result = await writeBunfigCredentials({
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
			packageManager: "bun",
			token: "bun-token",
			tokenSource: "azure-cli",
		});

		const contents = await readFile(filePath, "utf8");
		expect(result.filePath).toBe(filePath);
		expect(contents).toContain("frozenLockfile = true");
		expect(contents).toContain('[install.scopes."@old"]');
		expect(contents).toContain('token = "old"');
		expect(contents).toContain('url = "https://example.com/"');
		expect(contents).toContain('[install.scopes."@acme"]');
		expect(contents).toContain('token = "bun-token"');
		expect(contents).toContain(
			'url = "https://pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/"',
		);
	});

	test("creates a new global bunfig when one does not exist", async () => {
		const homeDirectory = await createHomeDirectory();
		process.env.HOME = homeDirectory;

		const { writeBunfigCredentials } = await import("./bunfig.ts");
		await writeBunfigCredentials({
			feeds: [
				{
					feed: "tooling",
					organization: "acme",
					project: undefined,
					registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/",
					scopes: ["@acme"],
					urlType: "visualstudio",
				},
			],
			packageManager: "bun",
			token: "bun-token",
			tokenSource: "env",
		});

		const contents = await readFile(join(homeDirectory, ".bunfig.toml"), "utf8");
		expect(contents).toContain('[install.scopes."@acme"]');
		expect(contents).toContain(
			'url = "https://acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/"',
		);
	});

	test("throws a typed error when a feed has no scopes", async () => {
		const homeDirectory = await createHomeDirectory();
		process.env.HOME = homeDirectory;

		const { WriteBunfigCredentialsError, writeBunfigCredentials } = await import("./bunfig.ts");
		await expect(
			writeBunfigCredentials({
				feeds: [
					{
						feed: "tooling",
						organization: "acme",
						project: undefined,
						registryUrl: "https://acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/",
						scopes: [],
						urlType: "visualstudio",
					},
				],
				packageManager: "bun",
				token: "bun-token",
				tokenSource: "env",
			}),
		).rejects.toBeInstanceOf(WriteBunfigCredentialsError);
	});
});

async function createHomeDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "az-npm-auth-home-"));
	createdDirectories.push(directory);
	return directory;
}
