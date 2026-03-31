import { afterEach, describe, expect, mock, test } from "bun:test";

import { getHelpText, parseArgs, runCli } from "./cli.ts";

afterEach(() => {
	process.exitCode = undefined;
});

describe("parseArgs", () => {
	test("parses token and cwd flags", () => {
		expect(parseArgs(["--token", "abc", "--cwd", "/tmp/project"])).toEqual({
			cwd: "/tmp/project",
			help: false,
			token: "abc",
			version: false,
		});
	});

	test("parses help and version flags", () => {
		expect(parseArgs(["--help", "--version"])).toEqual({
			help: true,
			version: true,
		});
	});
});

describe("runCli", () => {
	test("prints help for --help", async () => {
		const log = mock(() => undefined);

		await runCli(["--help"], { log });

		expect(log).toHaveBeenCalledWith(getHelpText());
		expect(process.exitCode).toBeUndefined();
	});

	test("prints version for --version", async () => {
		const log = mock(() => undefined);

		await runCli(["--version"], { log });

		expect(log).toHaveBeenCalledWith("0.1.0");
	});

	test("sets exit code 2 for non-token failures", async () => {
		const error = mock(() => undefined);

		await runCli([], {
			authenticate: async () => ({
				code: "detect_failed",
				message: "missing lockfile",
				ok: false,
			}),
			error,
		});

		expect(error).toHaveBeenCalledWith("missing lockfile");
		expect(process.exitCode).toBe(2);
	});

	test("passes through explicit token and cwd", async () => {
		const log = mock(() => undefined);
		const authenticate = mock(async () => ({
			filePath: "/Users/test/.npmrc",
			feeds: [],
			message: "ok",
			ok: true as const,
			packageManager: "npm" as const,
			tokenSource: "explicit" as const,
		}));

		await runCli(["--token", "abc", "--cwd", "/tmp/project"], {
			authenticate,
			log,
		});

		expect(authenticate).toHaveBeenCalledWith({ cwd: "/tmp/project", token: "abc" });
		expect(log).toHaveBeenCalledWith("ok");
	});
});
