#!/usr/bin/env node
import * as p from "@clack/prompts";
import chalk from "chalk";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

import figlet from "figlet";
import { morning } from "gradient-string";
import { vLog } from "./v-log.js";
import { setEnvVar } from "./set-env-var.js";

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

async function sleep(ms) {
  await new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function step1PullFiles() {
  // Step: Clone repo
  const step1 = p.spinner();
  step1.start("Downloading specialized agents...");
  await sleep(3000);

  const repo = "https://github.com/iebt/cognite-claude-plugin.git";
  const repoDir = path.join(HOME_DIR, "cognite-claude-plugin");
  try {
    execSync(`git clone ${repo} "${repoDir}"`, { stdio: "ignore" });
    step1.stop(chalk.green("Agents downloaded. Saved at ", repoDir));
  } catch (error) {
    // If already exists, try to git pull latest changes
    vLog(error);
    step1.message(chalk.yellow("Specialized agents already download, attempting to pull latest changes..."));
    try {
      execSync(`git -C "${repoDir}" pull`, { stdio: "ignore" });
      step1.stop(chalk.green(`Agents updated with latest changes at ${repoDir}`));
    } catch (pullErr) {
      vLog("Failed to pull latest changes:", pullErr);
      p.note("Could not update the existing repository. Please check your git setup.", "Update Failed");
    }
  }
}

async function step2InstallClaude() {
  const step2 = p.spinner();
  step2.start("Checking if Claude Code is installed...");
  await sleep(3000);

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
  const step3 = p.spinner();
  step3.start("Checking if Umbrella Certificate is installed...");
  await sleep(3000);

  const config = getConfigSync();
  const DEFAULT_CERT_PATH = "C:\\certs\\Cisco_Umbrella_Root_CA.cer";

  let certPath = config.ciscoUmbrellaCertPath || DEFAULT_CERT_PATH;

  vLog('Config: ', JSON.stringify(config, null, 2));

  // Check if default cert exists
  if (!fs.existsSync(certPath)) {
    step3.stop(chalk.yellow("Umbrella Certificate not found"));
    p.note(
      `Certificate file was not found at path: ${certPath}\n` +
      "Let's set the location of your Cisco Umbrella Root CA certificate."
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
    step3.stop(chalk.green(`Found Umbrella Certificate at: ${certPath}`));
  }


  config.ciscoUmbrellaCertPath = certPath;
  writeConfigSync(config);
  vLog(`Certificate path saved to ${CONFIG_PATH}`, "Config Updated");
}

async function step4CopyFilesToClaude() {
  const step4 = p.spinner();
  step4.start("Installing specialized migration agents in Claude...");
  await sleep(3000);

  const repoDir = path.join(HOME_DIR, "cognite-claude-plugin");

  const folders = ["commands", "agents"];
  const target = path.join(HOME_DIR, ".claude");

  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  for (const folder of folders) {
    const src = path.join(repoDir, 'plugin', folder);
    const dest = path.join(target, folder);

    fs.cpSync(src, dest, { recursive: true });
  }

  step4.stop(chalk.green(`Specialized agents installed at ${target}`));
}

async function step5SetEnvVars() {
  const step5 = p.spinner();
  step5.start("Adding required environment variables...");
  await sleep(3000);

  const config = getConfigSync();
  const certPath = config.ciscoUmbrellaCertPath;

  await setEnvVar("NODE_EXTRA_CA_CERTS", certPath, { scope: "user" });

  const installedEnvVars = ["NODE_EXTRA_CA_CERTS"];

  step5.stop(chalk.green(`environment variables successfuly set: [${installedEnvVars.join(', ')}]`));
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

  p.outro(chalk.green("Installation complete!", chalk.blueBright(" – You need to restart your terminal for installation to apply")));
}

main();
