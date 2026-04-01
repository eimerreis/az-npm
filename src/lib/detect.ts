import { access } from "node:fs/promises";
import { join } from "node:path";

const LOCKFILES = [
	{ fileName: "bun.lock", packageManager: "bun" },
	{ fileName: "bun.lockb", packageManager: "bun" },
	{ fileName: "pnpm-lock.yaml", packageManager: "pnpm" },
	{ fileName: "package-lock.json", packageManager: "npm" },
] as const;

export type PackageManager = (typeof LOCKFILES)[number]["packageManager"];

export class DetectPackageManagerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DetectPackageManagerError";
	}
}

export type DetectPackageManagerOptions = {
	cwd?: string;
};

export async function detectPackageManager(
	options: DetectPackageManagerOptions = {},
): Promise<PackageManager> {
	const cwd = options.cwd ?? process.cwd();
	const matches: PackageManager[] = [];
	const matchedLockfiles: string[] = [];

	for (const lockfile of LOCKFILES) {
		if (await pathExists(join(cwd, lockfile.fileName))) {
			matchedLockfiles.push(lockfile.fileName);
			if (!matches.includes(lockfile.packageManager)) {
				matches.push(lockfile.packageManager);
			}
		}
	}

	if (matches.length === 1) {
		return matches[0] as PackageManager;
	}

	if (matches.length > 1) {
		throw new DetectPackageManagerError(
			`Could not detect a single package manager in ${cwd}. Found multiple lockfiles: ${matchedLockfiles.join(", ")}.`,
		);
	}

	throw new DetectPackageManagerError(
		`Could not detect package manager in ${cwd}. Expected one of: bun.lock, bun.lockb, pnpm-lock.yaml, package-lock.json.`,
	);
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}
