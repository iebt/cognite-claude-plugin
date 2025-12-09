#!/usr/bin/env node
import * as p from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function banner() {
  const ascii = figlet.textSync("IEBT Migrator", { horizontalLayout: "default" });
  console.log(gradient.pastel.multiline(ascii));
}

async function main() {
  banner();
  p.intro(chalk.cyan("Welcome to the IEBT Migrator Installer"));

  const repo = "https://github.com/iebt/cognite-claude-plugin.git";
  const home = os.homedir();
  const repoDir = path.join(home, "cognite-claude-plugin");

  // Step: Clone repo
  const step1 = p.spinner();
  step1.start("Cloning repository...");
  try {
    execSync(`git clone ${repo} "${repoDir}"`, { stdio: "ignore" });
    step1.stop(chalk.green("Repository cloned"));
  } catch {
    step1.stop(chalk.yellow("Repository already exists, skipping"));
  }

  // Step: Check Claude installation
  const step2 = p.spinner();
  step2.start("Checking for Claude CLI...");
  let claudeInstalled = false;
  try {
    execSync("claude --version", { stdio: "ignore" });
    claudeInstalled = true;
    step2.stop(chalk.green("Claude is installed"));
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
        execSync("npm install -g claude", { stdio: "inherit" });
        spinner.stop(chalk.green("Claude installed successfully"));
      } catch {
        spinner.stop(chalk.red("Installation failed"));
      }
    }
  }

  // Step: Copy folders
  p.note("Copying plugin files into ~/.claude", "File Setup");

  const folders = ["templates", "migrations"];
  const target = path.join(home, ".claude");

  if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true });

  for (const folder of folders) {
    const src = path.join(repoDir, folder);
    const dest = path.join(target, folder);

    fs.cpSync(src, dest, { recursive: true });
  }

  p.outro(chalk.green("Installation complete! 🎉"));
}

main();
