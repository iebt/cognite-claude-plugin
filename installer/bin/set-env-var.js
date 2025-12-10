import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import { vLog } from "./v-log.js";

/**
 * Ensure a line exists in a text file, replacing previous export for same var if present.
 */
function ensureExportInFile(filePath, varName, exportLine) {
  let contents = "";
  if (fs.existsSync(filePath)) {
    contents = fs.readFileSync(filePath, "utf8");
  } else {
    // make sure parent dir exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const exportRegex = new RegExp(
    // matches lines like: export VAR=..., export VAR="...", export VAR='...'
    `^\\s*export\\s+${varName}=.*$`,
    "m"
  );

  if (exportRegex.test(contents)) {
    // replace existing line
    contents = contents.replace(exportRegex, exportLine);
  } else {
    // append (ensure trailing newline)
    if (!contents.endsWith("\n") && contents.length > 0) {
      contents += "\n";
    }
    contents += exportLine + "\n";
  }

  fs.writeFileSync(filePath, contents, "utf8");
}

/**
 * Detect a good Unix shell profile to modify.
 */
function detectUnixProfile() {
  const home = os.homedir();
  const shell = process.env.SHELL || "";

  const candidates = [];

  if (shell.includes("zsh")) {
    candidates.push(path.join(home, ".zshrc"));
  }
  if (shell.includes("bash")) {
    candidates.push(path.join(home, ".bashrc"));
  }

  // fallback
  candidates.push(path.join(home, ".profile"));

  // pick first existing, otherwise first candidate
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * Cross-platform persistent env var setter.
 *
 * scope: 'user' | 'system' (system requires admin on Windows)
 */
export function setEnvVar(name, value, options = {}) {
  const scope = options.scope || "user";

  if (process.env[name] && process.env[name] === value) {
    return { status: 'already-set' };
  }

  if (!name) {
    throw new Error("Env var name is required");
  }

  // 1. Set in current Node process
  process.env[name] = value;

  vLog('setting ', name, value, 'for ', process.platform);

  // 2. Persist for future sessions
  if (process.platform === "win32") {
    // Windows: use PowerShell + [Environment]::SetEnvironmentVariable
    const target = scope === "system" ? "Machine" : "User";

    // Build a PS script safely using JSON.stringify to avoid quoting hell
    const psScript = [
      `$name = ${JSON.stringify(name)}`,
      `$value = ${JSON.stringify(value)}`,
      `$target = '${target}'`,
      "[Environment]::SetEnvironmentVariable($name, $value, $target)"
    ].join("; ");

    try {
      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(
          /"/g,
          '\\"'
        )}"`,
        { stdio: "ignore" }
      );
    } catch (err) {
      throw new Error(
        `Failed to set Windows environment variable with PowerShell: ${err.message}`
      );
    }
  } else {
    // macOS / Linux: write into shell profile
    const profilePath = options.profilePath || detectUnixProfile();
    const escapedValue = String(value).replace(/"/g, '\\"');
    const exportLine = `export ${name}="${escapedValue}"`;

    vLog('Found profilePath: ', profilePath);
    vLog('About to set ', exportLine);

    try {
      ensureExportInFile(profilePath, name, exportLine);
    } catch (err) {
      throw new Error(
        `Failed to write env var to profile (${profilePath}): ${err.message}`
      );
    }
  }

  return { name, value, scope };
}
