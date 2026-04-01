import { authenticate } from "./index.ts";
import type { AuthenticateResult } from "./lib/auth.ts";

export type CliArgs = {
	cwd?: string;
	help: boolean;
	token?: string;
	version: boolean;
};

export type CliDependencies = {
	authenticate?: typeof authenticate;
	error?: (message?: unknown, ...optionalParams: unknown[]) => void;
	setExitCode?: (code: number) => void;
	log?: (message?: unknown, ...optionalParams: unknown[]) => void;
};

export async function runCli(
	argv = process.argv.slice(2),
	dependencies: CliDependencies = {},
): Promise<void> {
	const args = parseArgs(argv);
	const log = dependencies.log ?? console.log;
	const error = dependencies.error ?? console.error;
	const setExitCode =
		dependencies.setExitCode ??
		((code: number) => {
			process.exitCode = code;
		});

	if (args.help) {
		log(getHelpText());
		return;
	}

	if (args.version) {
		log("0.1.0");
		return;
	}

	const result = await (dependencies.authenticate ?? authenticate)({
		cwd: args.cwd,
		token: args.token,
	});
	applyResult(result, { error, log, setExitCode });
}

export function parseArgs(argv: string[]): CliArgs {
	const args: CliArgs = {
		help: false,
		version: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];

		if (argument === "--help" || argument === "-h") {
			args.help = true;
			continue;
		}

		if (argument === "--version" || argument === "-v") {
			args.version = true;
			continue;
		}

		if (argument === "--token") {
			args.token = argv[index + 1];
			index += 1;
			continue;
		}

		if (argument === "--cwd") {
			args.cwd = argv[index + 1];
			index += 1;
		}
	}

	return args;
}

export function getHelpText(): string {
	return `az-npm-auth

Usage:
  npx @eimerreis/az-npm [--token TOKEN] [--cwd PATH]

Options:
  --token <token>   Use an explicit Azure DevOps token
  --cwd <path>      Use a specific project directory
  -h, --help        Show help
  -v, --version     Show version`;
}

function applyResult(
	result: AuthenticateResult,
	output: Pick<CliDependencies, "error" | "log" | "setExitCode">,
): void {
	if (!result.ok) {
		output.error?.(result.message);
		output.setExitCode?.(result.code === "token_failed" ? 1 : 2);
		return;
	}

	output.log?.(result.message);
}
