#!/usr/bin/env node
import * as p from "@clack/prompts";
import chalk from "chalk";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import figlet from "figlet";
import { morning } from "gradient-string";

// Add parsing for --debug from process.argv
const DEBUG = process.argv.includes("--debug");

// Optionally, log all relevant actions if debug
function vLog(...args) {
  if (DEBUG) console.log(chalk.cyanBright("[debug]"), ...args);
}

// Inform user if in debug mode at startup
if (DEBUG) {
  console.log(chalk.gray("Debug mode enabled (--debug)"));
}



function banner() {
  const ascii = figlet.textSync("IEBT Migrator", { horizontalLayout: "default" });
  console.log(morning.multiline(ascii));
}

const HOME_DIR = os.homedir();
const CONFIG_PATH = path.join(HOME_DIR, ".claude", "iebt-migrator-config.json");

vLog('HOME_DIR: ', HOME_DIR);
vLog('CONFIG_PATH: ', CONFIG_PATH);

function getConfigSync() {
  let config = {};

  if (fs.existsSync(CONFIG_PATH)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    } catch {
      config = {};
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    }
  }

  return config;
}

function writeConfigSync(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

async function step1PullFiles() {
  // Step: Clone repo
  const step1 = p.spinner();
  step1.start("Cloning repository...");

  const repo = "https://github.com/iebt/cognite-claude-plugin.git";
  const repoDir = path.join(HOME_DIR, "cognite-claude-plugin");
  try {
    execSync(`git clone ${repo} "${repoDir}"`, { stdio: "ignore" });
    step1.stop(chalk.green("Repository cloned"));
  } catch {
    step1.stop(chalk.yellow("Repository already exists, skipping"));
  }
}

async function step2InstallClaude() {
  const step2 = p.spinner();
  step2.start("Checking for Claude CLI...");
  let claudeInstalled = false;
  try {
    // Use execSync to run "claude --version" and capture the result
    const result = execSync("claude --version", { stdio: "pipe" }).toString().trim();
    claudeInstalled = true;
    step2.stop(chalk.green(`Claude is installed (${result})`));
  } catch {
    step2.stop(chalk.red("Claude not found"));
  }

  if (!claudeInstalled) {
    const install = await p.confirm({
      message: "Claude is not installed. Install globally?",
    });

    if (install) {
      const spinner = p.spinner();
      spinner.start("Installing Claude globally...");
      try {
        execSync("npm install -g @anthropic-ai/claude-code", { stdio: "inherit" });
        spinner.stop(chalk.green("Claude installed successfully"));
      } catch {
        spinner.stop(chalk.red("Installation failed"));
      }
    }
  }
}

async function step3CheckCertificate() {
  const config = getConfigSync();
  const DEFAULT_CERT_PATH = "C:\\certs\\Cisco_Umbrella_Root_CA.cer";

  let certPath = config.ciscoUmbrellaCertPath || DEFAULT_CERT_PATH;

  vLog('Config: ', config);

  // Check if default cert exists
  if (!fs.existsSync(certPath)) {
    p.note(
      `Certificate file was not found at: ${certPath}\n` +
      "Let's set the location of your Cisco Umbrella Root CA certificate.",
      "Certificate Not Found"
    );

    certPath = await p.text({
      message: "Enter the absolute path to your Cisco_Umbrella_Root_CA.cer",
      placeholder: DEFAULT_CERT_PATH,
      validate: (value) =>
        fs.existsSync(value)
          ? undefined
          : `File does not exist at ${value}`,
    });
    p.note(`Using certificate: ${certPath}`);
  } else {
    p.note(`Certificate already exists at: ${certPath}`, "Found Certificate");
  }


  config.ciscoUmbrellaCertPath = certPath;
  writeConfigSync(config);
  p.note(`Certificate path saved to ${CONFIG_PATH}`, "Config Updated");
}

async function step4CopyFilesToClaude() {
  p.note("Copying plugin files into ~/.claude", "File Setup");

  const repoDir = path.join(HOME_DIR, "cognite-claude-plugin");

  const folders = ["commands", "agents"];
  const target = path.join(HOME_DIR, ".claude");

  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  for (const folder of folders) {
    const src = path.join(repoDir, 'poc_mvp2/plugin', folder);
    const dest = path.join(target, folder);

    fs.cpSync(src, dest, { recursive: true });
  }
}

async function step5SetEnvVars() {
  await step5SetNodeExtraCaCerts();
}

async function step5SetNodeExtraCaCerts() {
  // Check if NODE_EXTRA_CA_CERTS is set and is correct
  const nodeExtraCaCertsEnv = process.env.NODE_EXTRA_CA_CERTS;
  const config = getConfigSync();
  const certPath = config.ciscoUmbrellaCertPath;

  if (nodeExtraCaCertsEnv && certPath && path.resolve(nodeExtraCaCertsEnv) === path.resolve(certPath) && fs.existsSync(certPath)) {
    p.note(
      `NODE_EXTRA_CA_CERTS is already set correctly to: ${nodeExtraCaCertsEnv}`,
      "Environment Variable Already Set"
    );
    return;
  }

  vLog('About to set NODE_EXTRA_CA_CERTS');

  if (certPath && fs.existsSync(certPath)) {
    // Try to set in appropriate shell profile (~/.bashrc, ~/.zshrc)
    const shellProfiles = [
      path.join(HOME_DIR, ".bashrc"),
      path.join(HOME_DIR, ".zshrc"),
      path.join(HOME_DIR, ".profile"),
      path.join(HOME_DIR, ".bash_profile")
    ];

    const exportLine = `export NODE_EXTRA_CA_CERTS="${certPath}"\n`;

    let updated = false;

    for (const profile of shellProfiles) {
      if (fs.existsSync(profile)) {
        vLog('Found shell profile ', profile);

        const contents = fs.readFileSync(profile, "utf8");
        if (!contents.includes("NODE_EXTRA_CA_CERTS")) {
          fs.appendFileSync(profile, exportLine);
          p.note(
            `Added NODE_EXTRA_CA_CERTS to ${profile}\nRestart your terminal or run:\n\n${exportLine}`,
            "Environment Variable Updated"
          );
          updated = true;
          break;
        }
      }
    }

    if (!updated) {
      // None of the profiles exist, create .bashrc by default
      vLog('No shell profile found. Creating .bashrc');

      const defaultProfile = path.join(HOME_DIR, ".bashrc");
      fs.appendFileSync(defaultProfile, exportLine);
      p.note(
        `Created ${defaultProfile} and set NODE_EXTRA_CA_CERTS.\nRestart your terminal or run:\n\n${exportLine}`,
        "Environment Variable Set"
      );
    }
  } else {
    p.note(
      "Cisco Umbrella certificate path is missing or invalid. Please re-run the installer.",
      "Env Var Not Set"
    );
  }
}

async function main() {
  banner();
  p.intro(chalk.cyan("Welcome to the IEBT Migrator Installer"));

  await step1PullFiles();

  // Step: Check Claude installation
  await step2InstallClaude();

  await step3CheckCertificate();

  await step4CopyFilesToClaude();

  await step5SetEnvVars();

  p.outro(chalk.green("Installation complete! 🎉"));
}

main();
