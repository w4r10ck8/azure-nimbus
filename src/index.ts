#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { DashboardManager } from "./managers/index.js";
import { AzureOperations, ReportsOperations } from "./utils/index.js";

// Read version from package.json
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);
const version = packageJson.version;

const program = new Command();
const dashboardManager = new DashboardManager(version);

program
  .name("azure-report")
  .description("CLI tool to get information from Azure resources")
  .version(version);

// Add healthcheck as a direct command too
program
  .command("healthcheck")
  .description("Check Azure authentication and connection status")
  .action(async () => {
    await AzureOperations.runHealthCheck();
  });

program
  .command("release-report")
  .description("Generate a release report")
  .action(async () => {
    await ReportsOperations.generateReleaseReport();
  });

program
  .command("subscriptions")
  .description("List all Azure subscriptions")
  .action(async () => {
    try {
      await AzureOperations.listSubscriptions();
    } catch (error) {
      console.error(
        chalk.red(
          "❌ Error:",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
      process.exit(1);
    }
  });

program
  .command("resources")
  .description("List resources in a subscription")
  .option("-s, --subscription <id>", "Subscription ID")
  .action(async (options: { subscription?: string }) => {
    try {
      await AzureOperations.listResources(options.subscription);
    } catch (error) {
      console.error(
        chalk.red(
          "❌ Error:",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
      process.exit(1);
    }
  });

// Check if no arguments provided, show welcome screen
if (process.argv.length <= 2) {
  dashboardManager.showMainDashboard();
} else {
  program.parse();
}
