import { writeBunfigCredentials } from "./bunfig.ts";
import type { PackageManager } from "./detect.ts";
import { detectPackageManager } from "./detect.ts";
import type { AzureFeed } from "./feed.ts";
import { discoverFeeds } from "./feed.ts";
import { writeNpmrcCredentials } from "./npmrc.ts";
import type { ResolveTokenResult } from "./token.ts";
import { resolveToken } from "./token.ts";

export type AuthenticateDependencies = {
	detectPackageManager?: typeof detectPackageManager;
	discoverFeeds?: typeof discoverFeeds;
	resolveToken?: typeof resolveToken;
	writeBunfigCredentials?: CredentialWriter;
	writeNpmrcCredentials?: CredentialWriter;
};

export type AuthenticateOptions = {
	cwd?: string;
	dependencies?: AuthenticateDependencies;
	env?: NodeJS.ProcessEnv;
	token?: string;
};

export type AuthenticateResult =
	| {
			filePath: string;
			feeds: AzureFeed[];
			message: string;
			ok: true;
			packageManager: PackageManager;
			tokenSource: ResolveTokenResult["source"];
	  }
	| {
			code: AuthenticateFailureCode;
			message: string;
			ok: false;
	  };

type AuthenticateFailureCode = "detect_failed" | "feed_failed" | "token_failed" | "write_failed";

export type CredentialWriter = (options: CredentialWriterOptions) => Promise<{ filePath: string }>;

export type CredentialWriterOptions = {
	cwd?: string;
	feeds: AzureFeed[];
	packageManager: PackageManager;
	token: string;
	tokenSource: ResolveTokenResult["source"];
};

export async function authenticate(options: AuthenticateOptions = {}): Promise<AuthenticateResult> {
	const dependencies = options.dependencies ?? {};
	const detect = dependencies.detectPackageManager ?? detectPackageManager;
	const discover = dependencies.discoverFeeds ?? discoverFeeds;
	const tokenResolver = dependencies.resolveToken ?? resolveToken;

	let packageManager: PackageManager;
	try {
		packageManager = await detect({ cwd: options.cwd });
	} catch (error) {
		return fail("detect_failed", error);
	}

	let feeds: AzureFeed[];
	try {
		feeds = await discover({ cwd: options.cwd, packageManager });
	} catch (error) {
		return fail("feed_failed", error);
	}

	let tokenResult: ResolveTokenResult;
	try {
		tokenResult = await tokenResolver({
			env: options.env,
			explicitToken: options.token,
		});
	} catch (error) {
		return fail("token_failed", error);
	}

	const writer = selectWriter(packageManager, dependencies);
	try {
		const writeResult = await writer({
			cwd: options.cwd,
			feeds,
			packageManager,
			token: tokenResult.token,
			tokenSource: tokenResult.source,
		});

		return {
			filePath: writeResult.filePath,
			feeds,
			message: `Authenticated ${feeds.length} Azure DevOps ${pluralize("feed", feeds.length)} for ${packageManager} using ${tokenResult.source}.`,
			ok: true,
			packageManager,
			tokenSource: tokenResult.source,
		};
	} catch (error) {
		return fail("write_failed", error);
	}
}

function selectWriter(
	packageManager: PackageManager,
	dependencies: AuthenticateDependencies,
): CredentialWriter {
	if (packageManager === "bun") {
		return dependencies.writeBunfigCredentials ?? writeBunfigCredentials;
	}

	return dependencies.writeNpmrcCredentials ?? writeNpmrcCredentials;
}

function fail(code: AuthenticateFailureCode, error: unknown): AuthenticateResult {
	return {
		code,
		message: error instanceof Error ? error.message : "Unknown authentication error.",
		ok: false,
	};
}

function pluralize(word: string, count: number): string {
	return count === 1 ? word : `${word}s`;
}
