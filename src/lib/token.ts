import { spawn } from "node:child_process";

const AZURE_DEVOPS_RESOURCE = "499b84ac-1321-427f-aa17-267ca6975798";

type AzureCliResponse = {
	exitCode: number;
	stderr: string;
	stdout: string;
};

export type TokenSource = "explicit" | "env" | "azure-cli";

export type ResolveTokenResult = {
	source: TokenSource;
	token: string;
};

export type ResolveTokenOptions = {
	azureCli?: AzureCliExecutor;
	env?: NodeJS.ProcessEnv;
	explicitToken?: string;
};

export type AzureCliExecutor = (args: string[]) => Promise<AzureCliResponse>;

export class ResolveTokenError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ResolveTokenError";
	}
}

export async function resolveToken(options: ResolveTokenOptions = {}): Promise<ResolveTokenResult> {
	const explicitToken = options.explicitToken?.trim();
	if (explicitToken) {
		return {
			source: "explicit",
			token: explicitToken,
		};
	}

	const env = options.env ?? process.env;
	const envToken = env.SYSTEM_ACCESSTOKEN?.trim() || env.AZURE_DEVOPS_EXT_PAT?.trim();
	if (envToken) {
		return {
			source: "env",
			token: envToken,
		};
	}

	const azureCli = options.azureCli ?? runAzureCli;
	let response: AzureCliResponse;

	try {
		response = await azureCli([
			"account",
			"get-access-token",
			"--resource",
			AZURE_DEVOPS_RESOURCE,
			"--output",
			"json",
		]);
	} catch (error) {
		throw new ResolveTokenError(
			`Failed to run Azure CLI for token acquisition: ${(error as Error).message}`,
		);
	}

	if (response.exitCode !== 0) {
		throw new ResolveTokenError(
			`Azure CLI token acquisition failed: ${response.stderr.trim() || "unknown error"}`,
		);
	}

	let payload: unknown;
	try {
		payload = JSON.parse(response.stdout);
	} catch {
		throw new ResolveTokenError("Azure CLI returned invalid JSON for access token output.");
	}

	const token = getAccessToken(payload);
	if (!token) {
		throw new ResolveTokenError("Azure CLI output did not include an access token.");
	}

	return {
		source: "azure-cli",
		token,
	};
}

async function runAzureCli(args: string[]): Promise<AzureCliResponse> {
	return await new Promise((resolve, reject) => {
		const subprocess = spawn("az", args, {
			stdio: ["ignore", "pipe", "pipe"],
		});

		let stdout = "";
		let stderr = "";

		subprocess.stdout.on("data", (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});

		subprocess.stderr.on("data", (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});

		subprocess.on("error", reject);
		subprocess.on("close", (exitCode) => {
			resolve({
				exitCode: exitCode ?? 1,
				stderr,
				stdout,
			});
		});
	});
}

function getAccessToken(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const accessToken = (payload as { accessToken?: unknown }).accessToken;
	return typeof accessToken === "string" && accessToken.trim() ? accessToken : null;
}
