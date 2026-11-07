import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { CACHE_DIR, type SourceRepo } from "./config.ts";

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export interface LocalRepo {
  dir: string;
  commit: string;
  ref: string;
}

/**
 * Clones (or updates) a repository, checking out only the needed paths.
 * Shallow, blobless clone + sparse checkout: fast even for the Foundry system.
 */
export function fetchRepo(repo: SourceRepo, offline = false): LocalRepo {
  const dir = path.join(CACHE_DIR, repo.name);
  mkdirSync(CACHE_DIR, { recursive: true });

  if (!existsSync(path.join(dir, ".git"))) {
    if (offline) throw new Error(`Repository ${repo.name} is not cached and offline mode is on.`);
    console.log(`  cloning ${repo.url} (${repo.ref})…`);
    execFileSync("git", ["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--branch", repo.ref, repo.url, dir], {
      stdio: "inherit",
    });
  } else if (!offline) {
    console.log(`  updating ${repo.name} (${repo.ref})…`);
    git(dir, "fetch", "--depth", "1", "--filter=blob:none", "origin", repo.ref);
    git(dir, "checkout", "--force", "FETCH_HEAD");
  }

  git(dir, "sparse-checkout", "set", "--no-cone", ...repo.paths);
  return { dir, commit: git(dir, "rev-parse", "HEAD"), ref: repo.ref };
}
