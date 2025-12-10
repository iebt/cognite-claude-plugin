import * as p from "@clack/prompts";
import chalk from "chalk";

const DEBUG = process.argv.includes("--debug");

// Optionally, log all relevant actions if debug
export function vLog(...args) {
  if (DEBUG) p.note(chalk.cyanBright("[debug]", ...args));
}

// Inform user if in debug mode at startup
if (DEBUG) {
  console.log(chalk.gray("Debug mode enabled (--debug)"));
}
