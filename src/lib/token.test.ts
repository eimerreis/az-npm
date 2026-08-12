import { describe, expect, mock, test } from "bun:test";

import {
	getAzureCliInvocation,
	getAzureCliSpawnOptions,
	ResolveTokenError,
	resolveToken,
} from "./token.ts";

describe("getAzureCliSpawnOptions", () => {
	test("uses a shell on Windows so az.cmd can run", () => {
		expect(getAzureCliSpawnOptions("win32").shell).toBe(true);
	});

	test("does not use a shell on non-Windows platforms", () => {
		expect(getAzureCliSpawnOptions("darwin").shell).toBe(false);
		expect(getAzureCliSpawnOptions("linux").shell).toBe(false);
	});
});

describe("getAzureCliInvocation", () => {
	test("uses a complete command without separate arguments on Windows", () => {
		expect(
			getAzureCliInvocation(["account", "get-access-token", "--output", "json"], "win32"),
		).toEqual({
			args: [],
			command: "az account get-access-token --output json",
		});
	});

	test("uses direct command arguments on non-Windows platforms", () => {
		const args = ["account", "get-access-token", "--output", "json"];

		expect(getAzureCliInvocation(args, "darwin")).toEqual({ args, command: "az" });
		expect(getAzureCliInvocation(args, "linux")).toEqual({ args, command: "az" });
	});
});

describe("resolveToken", () => {
	test("returns an explicit token before any other source", async () => {
		const azureCli = mock(async () => ({ exitCode: 0, stderr: "", stdout: "{}" }));

		expect(
			await resolveToken({
				azureCli,
				explicitToken: "  direct-token  ",
			}),
		).toEqual({
			source: "explicit",
			token: "direct-token",
		});
		expect(azureCli).not.toHaveBeenCalled();
	});

	test("returns SYSTEM_ACCESSTOKEN before Azure CLI", async () => {
		const azureCli = mock(async () => ({ exitCode: 0, stderr: "", stdout: "{}" }));

		expect(
			await resolveToken({
				azureCli,
				env: { SYSTEM_ACCESSTOKEN: "ci-token" },
			}),
		).toEqual({
			source: "env",
			token: "ci-token",
		});
		expect(azureCli).not.toHaveBeenCalled();
	});

	test("falls back to AZURE_DEVOPS_EXT_PAT before Azure CLI", async () => {
		const azureCli = mock(async () => ({ exitCode: 0, stderr: "", stdout: "{}" }));

		expect(
			await resolveToken({
				azureCli,
				env: { AZURE_DEVOPS_EXT_PAT: "pat-token" },
			}),
		).toEqual({
			source: "env",
			token: "pat-token",
		});
		expect(azureCli).not.toHaveBeenCalled();
	});

	test("uses Azure CLI when no explicit or env token exists", async () => {
		const azureCli = mock(async () => ({
			exitCode: 0,
			stderr: "",
			stdout: JSON.stringify({ accessToken: "azure-cli-token" }),
		}));

		expect(await resolveToken({ azureCli, env: {} })).toEqual({
			source: "azure-cli",
			token: "azure-cli-token",
		});
		expect(azureCli).toHaveBeenCalledTimes(1);
	});

	test("throws a typed error when Azure CLI exits non-zero", async () => {
		const azureCli = mock(async () => ({
			exitCode: 1,
			stderr: "not logged in",
			stdout: "",
		}));

		await expect(resolveToken({ azureCli, env: {} })).rejects.toBeInstanceOf(ResolveTokenError);
	});

	test("throws a typed error when Azure CLI output is malformed", async () => {
		const azureCli = mock(async () => ({
			exitCode: 0,
			stderr: "",
			stdout: "{",
		}));

		await expect(resolveToken({ azureCli, env: {} })).rejects.toBeInstanceOf(ResolveTokenError);
	});
});
