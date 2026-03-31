import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DetectPackageManagerError, detectPackageManager } from "./detect.ts";

const createdDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(
		createdDirectories
			.splice(0)
			.map((directory) => rm(directory, { recursive: true, force: true })),
	);
});

describe("detectPackageManager", () => {
	test("detects bun from bun.lock", async () => {
		const cwd = await createProjectWith("bun.lock");

		expect(await detectPackageManager({ cwd })).toBe("bun");
	});

	test("detects bun from bun.lockb", async () => {
		const cwd = await createProjectWith("bun.lockb");

		expect(await detectPackageManager({ cwd })).toBe("bun");
	});

	test("detects pnpm from pnpm-lock.yaml", async () => {
		const cwd = await createProjectWith("pnpm-lock.yaml");

		expect(await detectPackageManager({ cwd })).toBe("pnpm");
	});

	test("detects npm from package-lock.json", async () => {
		const cwd = await createProjectWith("package-lock.json");

		expect(await detectPackageManager({ cwd })).toBe("npm");
	});

	test("prefers bun when multiple lockfiles are present", async () => {
		const cwd = await createProjectWith("package-lock.json", "pnpm-lock.yaml", "bun.lock");

		expect(await detectPackageManager({ cwd })).toBe("bun");
	});

	test("throws a typed error when no known lockfile exists", async () => {
		const cwd = await createProjectWith();

		await expect(detectPackageManager({ cwd })).rejects.toBeInstanceOf(DetectPackageManagerError);
	});
});

async function createProjectWith(...fileNames: string[]): Promise<string> {
	const directory = await mkdtemp(join(tmpdir(), "az-npm-auth-"));
	createdDirectories.push(directory);

	await Promise.all(fileNames.map((fileName) => writeFile(join(directory, fileName), "")));

	return directory;
}
