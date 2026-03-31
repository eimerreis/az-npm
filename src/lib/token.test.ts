import { describe, expect, mock, test } from "bun:test";

import { ResolveTokenError, resolveToken } from "./token.ts";

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
