#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// CONFIG – tweak as needed
const REPO_URL = "https://github.com/iebt/cognite-claude-plugin.git";
const REPO_DIR_NAME = "cognite-claude-plugin"; // folder under home where we clone
const CLAUDE_CLI_NAME = "claude"; // command to check
const FOLDERS_TO_COPY = [
  // relative paths inside the repo to copy into ~/.claude
  "templates",
  "migrations"
];

function log(msg) {
  console.log(`> ${msg}`);
}

function runCommand(cmd, options = {}) {
  try {
    execSync(cmd, { stdio: "inherit", ...options });
    return true;
  } catch (err) {
    return false;
  }
}

function isCommandAvailable(cmd) {
  try {
    if (process.platform === "win32") {
      execSync(`where ${cmd}`, { stdio: "ignore" });
    } else {
      execSync(`command -v ${cmd}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

function askYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      const normalized = (answer || "").trim().toLowerCase();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

// Recursively copy directories/files
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    log(`WARNING: source does not exist, skipping: ${src}`);
    return;
  }

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      copyRecursive(srcPath, destPath);
    }
  } else {
    // file
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

async function main() {
  log("Starting IEBT migrator installer...");

  const homeDir = os.homedir();
  const repoDir = path.join(homeDir, REPO_DIR_NAME);
  const claudeConfigDir = path.join(homeDir, ".claude");

  // 1. git clone repository into user folder (home dir)
  if (fs.existsSync(repoDir)) {
    log(`Repo directory already exists at ${repoDir}, skipping clone.`);
  } else {
    log(`Cloning ${REPO_URL} into ${repoDir}...`);
    const success = runCommand(`git clone ${REPO_URL} "${repoDir}"`);
    if (!success) {
      console.error("ERROR: git clone failed. Please check your git setup and try again.");
      process.exit(1);
    }
  }

  // 2. Check if Claude is installed globally
  log(`Checking if "${CLAUDE_CLI_NAME}" CLI is installed globally...`);
  let claudeAvailable = isCommandAvailable(CLAUDE_CLI_NAME);

  if (!claudeAvailable) {
    const wantsInstall = await askYesNo(
      `"${CLAUDE_CLI_NAME}" was not found in PATH. Do you want to install it globally with npm?`
    );

    if (wantsInstall) {
      log(`Installing ${CLAUDE_CLI_NAME} globally with npm...`);
      const installed = runCommand(`npm install -g ${CLAUDE_CLI_NAME}`);
      if (!installed) {
        console.error("ERROR: Failed to install Claude globally via npm.");
      } else {
        claudeAvailable = isCommandAvailable(CLAUDE_CLI_NAME);
      }
    } else {
      log("Skipping Claude installation as requested.");
    }
  }

  // 3. Check if installation worked, if not ask about env var
  if (!claudeAvailable) {
    const wantsEnvHelp = await askYesNo(
      `"${CLAUDE_CLI_NAME}" is still not available. Do you want tips on fixing your PATH environment variable?`
    );

    if (wantsEnvHelp) {
      console.log(`
You might need to add your global npm bin directory to PATH.

Common locations:
  - macOS/Linux:  ~/.npm-global/bin  or  $(npm bin -g)
  - Windows:      %APPDATA%\\npm

Example for bash/zsh (macOS/Linux):
  echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.bashrc
  source ~/.bashrc

After fixing PATH, try running:  ${CLAUDE_CLI_NAME} --help
`);
    }
  } else {
    log(`"${CLAUDE_CLI_NAME}" CLI is available.`);
  }

  // 4. Copy some folders from repo into ~/.claude
  log(`Ensuring Claude config directory exists at ${claudeConfigDir}...`);
  if (!fs.existsSync(claudeConfigDir)) {
    fs.mkdirSync(claudeConfigDir, { recursive: true });
  }

  log("Copying folders from repository into ~/.claude...");
  for (const folder of FOLDERS_TO_COPY) {
    const src = path.join(repoDir, folder);
    const dest = path.join(claudeConfigDir, folder);

    log(`- Copying ${src} -> ${dest}`);
    try {
      copyRecursive(src, dest);
    } catch (err) {
      console.error(`ERROR copying ${folder}:`, err.message);
    }
  }

  log("Done! IEBT migrator installation steps completed.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
