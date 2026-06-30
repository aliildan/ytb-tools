import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { cacheDir } from "../library/paths.js";

const RELEASE_BASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download";

export function assetName(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  if (platform === "win32") return "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  if (platform === "linux") return arch === "arm64" ? "yt-dlp_linux_aarch64" : "yt-dlp_linux";
  return "yt-dlp_linux";
}

export function jsRuntimeArg(): string {
  return `node:${process.execPath}`;
}

function binPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(cacheDir(env), "bin", assetName());
}

function commandExists(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn(cmd, ["--version"]);
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function verifyChecksum(buf: Buffer, asset: string): Promise<void> {
  // Best-effort: if SUMS is unreachable, skip rather than break provisioning.
  let sums: string;
  try {
    const res = await fetch(`${RELEASE_BASE}/SHA2-256SUMS`);
    if (!res.ok) return;
    sums = await res.text();
  } catch {
    return;
  }
  const line = sums.split("\n").find((l) => l.trim().endsWith(asset));
  if (!line) return;
  const expected = line.trim().split(/\s+/)[0].toLowerCase();
  const actual = createHash("sha256").update(buf).digest("hex");
  if (expected && actual !== expected) {
    throw new Error(`yt-dlp checksum mismatch for ${asset}: expected ${expected}, got ${actual}`);
  }
}

async function download(env: NodeJS.ProcessEnv): Promise<string> {
  const asset = assetName();
  const dest = binPath(env);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(`${RELEASE_BASE}/${asset}`);
  if (!res.ok) throw new Error(`Failed to download yt-dlp (${asset}): HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await verifyChecksum(buf, asset);
  await fs.writeFile(dest, buf);
  if (process.platform !== "win32") await fs.chmod(dest, 0o755);
  return dest;
}

export async function ensureYtDlp(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const override = env.YT_DLP_PATH?.trim();
  if (override) return override;
  if (await commandExists("yt-dlp")) return "yt-dlp";
  const cached = binPath(env);
  if (await fileExists(cached)) return cached;
  try {
    return await download(env);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Could not provision yt-dlp automatically (${msg}). Install it manually — ` +
        `macOS: 'brew install yt-dlp'; Linux: 'pipx install yt-dlp'; ` +
        `Windows: 'winget install yt-dlp' — or set YT_DLP_PATH to an existing binary.`,
    );
  }
}
