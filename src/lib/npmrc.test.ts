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

describe("writeNpmrcCredentials", () => {
	test("writes Azure auth entries into the user .npmrc and preserves existing settings", async () => {
		const homeDirectory = await createHomeDirectory();
		process.env.HOME = homeDirectory;
		const filePath = join(homeDirectory, ".npmrc");
		await Bun.write(filePath, "registry=https://registry.npmjs.org/\ncolor=true\n");

		const { writeNpmrcCredentials } = await import("./npmrc.ts");
		const result = await writeNpmrcCredentials({
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
			token: "plain-token",
			tokenSource: "explicit",
		});

		const contents = await readFile(filePath, "utf8");
		expect(result.filePath).toBe(filePath);
		expect(contents).toContain("registry=https://registry.npmjs.org/");
		expect(contents).toContain("color=true");
		expect(contents).toContain(
			"//pkgs.dev.azure.com/acme/web/_packaging/shared/npm/:_authToken=plain-token",
		);
		expect(contents).toContain(
			"//pkgs.dev.azure.com/acme/web/_packaging/shared/npm/registry/:_authToken=plain-token",
		);
	});

	test("creates a new user .npmrc when one does not exist", async () => {
		const homeDirectory = await createHomeDirectory();
		process.env.HOME = homeDirectory;

		const { writeNpmrcCredentials } = await import("./npmrc.ts");
		await writeNpmrcCredentials({
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
			packageManager: "pnpm",
			token: "another-token",
			tokenSource: "env",
		});

		const contents = await readFile(join(homeDirectory, ".npmrc"), "utf8");
		expect(contents).toContain(
			"//acme.pkgs.visualstudio.com/_packaging/tooling/npm/:_authToken=another-token",
		);
		expect(contents).toContain(
			"//acme.pkgs.visualstudio.com/_packaging/tooling/npm/registry/:_authToken=another-token",
		);
	});

	test("uses the exact feed from the project npmrc instead of inventing alternate hosts", async () => {
		const homeDirectory = await createHomeDirectory();
		process.env.HOME = homeDirectory;

		const { writeNpmrcCredentials } = await import("./npmrc.ts");
		await writeNpmrcCredentials({
			feeds: [
				{
					feed: "NpmFeed",
					organization: "tapioone",
					project: undefined,
					registryUrl: "https://pkgs.dev.azure.com/tapioone/_packaging/NpmFeed/npm/registry/",
					scopes: ["@tapio"],
					urlType: "azure-devops",
				},
			],
			packageManager: "npm",
			token: "jwt-token",
			tokenSource: "azure-cli",
		});

		const contents = await readFile(join(homeDirectory, ".npmrc"), "utf8");
		expect(contents).toContain(
			"//pkgs.dev.azure.com/tapioone/_packaging/NpmFeed/npm/:_authToken=jwt-token",
		);
		expect(contents).toContain(
			"//pkgs.dev.azure.com/tapioone/_packaging/NpmFeed/npm/registry/:_authToken=jwt-token",
		);
		expect(contents).not.toContain("tapioone.pkgs.visualstudio.com");
	});
});

async function createHomeDirectory(): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "az-npm-auth-home-"));
	createdDirectories.push(directory);
	return directory;
}
