import chalk from "chalk";
import { MenuSystem } from "../ui/menu-system.js";
import { CLIProgress } from "../core/progress.js";
import { AzureService } from "../../services/azure-service.js";
import {
  AzureDevOpsService,
  BuildReport,
  UATReleaseReport,
  EnvironmentInfo,
  ApprovalInfo,
  BuildArtifact,
} from "../../services/azure-devops-service.js";
import { TemplateEngine } from "./template-engine.js";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  unlinkSync,
  statSync,
} from "fs";
import { join } from "path";
import inquirer from "inquirer";

export class ReportsOperations {
  private static azureService = new AzureService();
  private static azureDevOpsService = new AzureDevOpsService();

  static async generateReleaseReport(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Generating Release Report",
      "Release Report"
    );

    // Ask for build number
    console.log(chalk.cyan("📋 Release Report Generator"));
    console.log("");
    console.log(
      chalk.white(
        "This will generate a comprehensive build and deployment report."
      )
    );
    console.log(
      chalk.gray("Examples: 20251013.1 (build number) or 156536 (build ID)")
    );
    console.log("");

    const { buildInput } = await inquirer.prompt([
      {
        type: "input",
        name: "buildInput",
        message: "Enter the build number or build ID:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Build number or ID is required";
          }
          return true;
        },
      },
    ]);

    const progress = new CLIProgress("Generating release report");
    const totalSteps = 7; // Total number of steps in the process

    // Use progress bar for multi-step operation
    progress.startProgressBar(totalSteps, "📊 Generating release report");

    try {
      // Step 1: Configure Azure DevOps and verify authentication
      progress.updateProgress(1);
      await this.azureDevOpsService.configureDefaults();

      const isAuthenticated =
        await this.azureDevOpsService.verifyAuthentication();
      if (!isAuthenticated) {
        progress.stopProgressBar("❌ Authentication failed");
        console.log("");
        MenuSystem.displayError(
          "Authentication required",
          "Please authenticate with: az login --allow-no-subscriptions"
        );
        return;
      }

      // Step 2: Resolve build information
      progress.updateProgress(2);

      // Get build details
      let buildDetails;
      try {
        // Check if input looks like a build number (YYYYMMDD.X format)
        if (/^\d{8}\.\d+$/.test(buildInput.trim())) {
          buildDetails = await this.azureDevOpsService.getBuildByNumber(
            buildInput.trim()
          );
        } else {
          buildDetails = await this.azureDevOpsService.getBuildById(
            buildInput.trim()
          );
        }
      } catch (error) {
        progress.stopProgressBar("❌ Build lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Build not found",
          error instanceof Error ? error.message : "Unknown error"
        );
        return;
      }

      const buildInfo = this.azureDevOpsService.extractBuildInfo(buildDetails);

      // Step 3: Extract health check results
      progress.updateProgress(3);
      const healthCheck =
        await this.azureDevOpsService.extractHealthCheckResults(
          buildInfo.id,
          buildInfo.result
        );

      // Step 4: Gather test results
      progress.updateProgress(4);
      const { testing, coverage } =
        await this.azureDevOpsService.extractAllTestResults(buildInfo.id);

      // Step 5: Retrieve build artifacts
      progress.updateProgress(5);
      const artifacts = await this.azureDevOpsService.getBuildArtifacts(
        buildInfo.id
      );

      // Step 6: Create build report data
      progress.updateProgress(6);
      const buildReport: BuildReport = {
        build: buildInfo,
        healthCheck,
        testing,
        coverage,
        artifacts,
        generatedAt: new Date().toISOString(),
      };

      // Step 7: Generate report files
      progress.updateProgress(7);

      // Ensure output directory exists
      const outputDir = join(process.cwd(), "output");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate both JSON and Markdown reports
      const reportName = `build-report-${buildInput.trim()}`;
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];

      const jsonFilename = `${reportName}-${timestamp}.json`;
      const mdFilename = `${reportName}-${timestamp}.md`;
      const jsonFilepath = join(outputDir, jsonFilename);
      const mdFilepath = join(outputDir, mdFilename);

      // Write JSON report
      writeFileSync(jsonFilepath, JSON.stringify(buildReport, null, 2));

      // Write Markdown report
      const markdownReport =
        TemplateEngine.generateDevReleaseReport(buildReport);
      writeFileSync(mdFilepath, markdownReport);

      progress.stopProgressBar("✅ Release report generated successfully");

      // Display summary
      console.log("");
      console.log(
        chalk.green(`🎉 Report for build ${buildInfo.number} generated!`)
      );
      console.log("");
      console.log(chalk.cyan("📊 Build Summary:"));
      console.log(
        chalk.white(`   � Build: ${buildInfo.number} (ID: ${buildInfo.id})`)
      );
      console.log(
        chalk.white(`   � Status: ${buildInfo.status} / ${buildInfo.result}`)
      );
      console.log(chalk.white(`   ⏱️  Duration: ${buildInfo.duration}`));
      console.log(chalk.white(`   🌿 Branch: ${buildInfo.sourceBranch}`));

      console.log("");
      console.log(chalk.cyan("🏥 Health Check Summary:"));
      console.log(chalk.white(`   🔒 Security: ${healthCheck.securityAudit}`));
      console.log(
        chalk.white(`   � Environment: ${healthCheck.environmentCheck}`)
      );
      console.log(chalk.white(`   🎨 Prettier: ${healthCheck.prettier}`));
      console.log(chalk.white(`   📝 ESLint: ${healthCheck.eslint}`));
      console.log(chalk.white(`   📘 TypeScript: ${healthCheck.typescript}`));
      console.log(chalk.white(`   🔨 Build: ${healthCheck.buildSuccess}`));

      if (testing.tests !== "No test results found") {
        console.log("");
        console.log(chalk.cyan("🧪 Test Summary:"));
        console.log(chalk.white(`   📁 Files: ${testing.testFiles}`));
        console.log(chalk.white(`   🧪 Tests: ${testing.tests}`));
        console.log(chalk.white(`   ⏱️  Duration: ${testing.duration}`));
      }

      console.log("");
      console.log(chalk.green("📁 Generated Files:"));
      console.log(chalk.white(`   📄 ${jsonFilename}`));
      console.log(chalk.white(`   📄 ${mdFilename}`));
      console.log(chalk.gray(`   📍 Location: ${outputDir}`));

      console.log("");
      console.log(chalk.blue(`� Build URL: ${buildInfo.buildUrl}`));
    } catch (error) {
      progress.fail("❌ Failed to generate report");
      console.log("");

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Provide specific error guidance based on error type
      if (
        errorMessage.includes("login") ||
        errorMessage.includes("authentication")
      ) {
        MenuSystem.displayError(
          "Authentication Required",
          "Please authenticate with Azure DevOps"
        );
        console.log("");
        console.log(
          chalk.yellow("💡 Run: ") +
            chalk.cyan("az login --allow-no-subscriptions")
        );
      } else if (
        errorMessage.includes("not found") ||
        errorMessage.includes("Build")
      ) {
        MenuSystem.displayError(
          "Build Not Found",
          `Build "${buildInput.trim()}" could not be located`
        );
        console.log("");
        console.log(chalk.yellow("💡 Please verify:"));
        console.log(chalk.white("   • Build number format (e.g., 20251013.1)"));
        console.log(chalk.white("   • Build ID is correct"));
        console.log(chalk.white("   • You have access to the project"));
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("timeout")
      ) {
        MenuSystem.displayError(
          "Network Issue",
          "Unable to connect to Azure DevOps"
        );
        console.log("");
        console.log(
          chalk.yellow("💡 Check your internet connection and try again")
        );
      } else {
        MenuSystem.displayError("Report Generation Failed", errorMessage);
        console.log("");
        console.log(chalk.yellow("💡 Troubleshooting:"));
        console.log(
          chalk.white(
            "   • Ensure Azure DevOps authentication: az login --allow-no-subscriptions"
          )
        );
        console.log(chalk.white("   • Verify build number/ID format"));
        console.log(chalk.white("   • Check project access permissions"));
      }
    }
  }

  static async generateUATReleaseReport(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Generating UAT Release Report",
      "UAT Release Report"
    );

    // Ask for release number
    console.log(chalk.cyan("🏢 UAT Release Report Generator"));
    console.log("");
    console.log(
      chalk.white(
        "This will generate a comprehensive UAT release and deployment report."
      )
    );
    console.log(
      chalk.gray(
        "Examples: 496, 490, 489 (will search for Release-496, Release-490, Release-489)"
      )
    );
    console.log("");

    const { releaseInput } = await inquirer.prompt([
      {
        type: "input",
        name: "releaseInput",
        message: "Enter the release number (just the number):",
        validate: (input: string) => {
          const trimmed = input.trim();
          if (!trimmed) {
            return "Release number is required";
          }
          // Check if it's a valid number or already formatted as Release-XXX
          if (!/^(Release-)?(\d+)$/.test(trimmed)) {
            return "Please enter a valid release number (e.g., 496 or Release-496)";
          }
          return true;
        },
      },
    ]);

    // Normalize the release number to ensure it starts with "Release-"
    const releaseNumber = releaseInput.trim().startsWith("Release-")
      ? releaseInput.trim()
      : `Release-${releaseInput.trim()}`;

    const progress = new CLIProgress("Generating UAT release report");
    const totalSteps = 8; // Total number of steps in the process

    // Use progress bar for multi-step operation
    progress.startProgressBar(totalSteps, "🏢 Generating UAT release report");

    try {
      // Step 1: Configure Azure DevOps and verify authentication
      progress.updateProgress(1);
      await this.azureDevOpsService.configureDefaults();

      const isAuthenticated =
        await this.azureDevOpsService.verifyAuthentication();
      if (!isAuthenticated) {
        progress.stopProgressBar("❌ Authentication failed");
        console.log("");
        MenuSystem.displayError(
          "Authentication required",
          "Please authenticate with: az login --allow-no-subscriptions"
        );
        return;
      }

      // Step 2: Get release information
      progress.updateProgress(2);
      let releaseInfo;
      try {
        releaseInfo = await this.azureDevOpsService.getReleaseByNumber(
          releaseNumber.trim()
        );
      } catch (error) {
        progress.stopProgressBar("❌ Release lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Release not found",
          error instanceof Error ? error.message : "Unknown error"
        );
        return;
      }

      // Step 3: Get associated build number and verify it exists
      progress.updateProgress(3);
      let buildNumber = releaseInfo.associatedBuild;

      // If we couldn't extract build number from release artifacts, try alternative method
      if (buildNumber === "Unknown") {
        console.log(
          "Build number not found in artifacts, trying alternative method..."
        );
        try {
          buildNumber = await this.azureDevOpsService.getBuildFromRelease(
            releaseInfo.id
          );
          console.log(`Found build using alternative method: ${buildNumber}`);
        } catch (error) {
          console.log(
            "Alternative method also failed:",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }

      console.log(`Found associated build: ${buildNumber}`);

      if (buildNumber === "Unknown") {
        progress.stopProgressBar("❌ Build lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Associated build not found",
          `Could not determine the build number associated with ${releaseNumber}. Please check if the release has an associated build artifact.`
        );
        return;
      }

      let buildDetails;
      try {
        buildDetails = await this.azureDevOpsService.getBuildByNumber(
          buildNumber
        );
      } catch (error) {
        progress.stopProgressBar("❌ Build lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Associated build not found",
          `Build ${buildNumber} associated with ${releaseNumber} not found`
        );
        return;
      }

      const buildInfo = this.azureDevOpsService.extractBuildInfo(buildDetails);

      // Step 4: Get release environments
      progress.updateProgress(4);
      const environments = await this.azureDevOpsService.getReleaseEnvironments(
        releaseInfo.id
      );

      // Check if UAT deployment is complete
      const uatEnvironment = environments.find((env) =>
        env.name.toLowerCase().includes("uat")
      );

      // For testing purposes, allow report generation even if UAT isn't complete
      // but show a warning
      if (!uatEnvironment || uatEnvironment.status !== "succeeded") {
        console.log("");
        console.log(
          chalk.yellow("⚠️  Warning: UAT deployment is not complete")
        );
        console.log(
          chalk.yellow(
            `   UAT status: ${uatEnvironment?.status || "Not found"}`
          )
        );
        console.log(
          chalk.yellow("   Generating report anyway for testing purposes...")
        );
        console.log("");
      }

      // Step 5: Get release approvals
      progress.updateProgress(5);
      const approvals = await this.azureDevOpsService.getReleaseApprovals(
        releaseInfo.id
      );

      // Step 6: Extract health check results for the build
      progress.updateProgress(6);
      const healthCheck =
        await this.azureDevOpsService.extractHealthCheckResults(
          buildInfo.id,
          buildInfo.result
        );

      // Step 7: Gather test results and artifacts
      progress.updateProgress(7);
      const { testing, coverage } =
        await this.azureDevOpsService.extractAllTestResults(buildInfo.id);
      const artifacts = await this.azureDevOpsService.getBuildArtifacts(
        buildInfo.id
      );

      // Step 8: Generate report files
      progress.updateProgress(8);

      // Create UAT release report data
      const uatReleaseReport: UATReleaseReport = {
        release: releaseInfo,
        build: buildInfo,
        environments,
        approvals,
        healthCheck,
        testing,
        coverage,
        artifacts,
        generatedAt: new Date().toISOString(),
      };

      // Ensure output directory exists
      const outputDir = join(process.cwd(), "output");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate report files
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];

      const jsonFilename = `build-report-${releaseNumber.trim()}-${timestamp}.json`;
      const mdFilename = `build-report-${releaseNumber.trim()}-${timestamp}.md`;
      const jsonFilepath = join(outputDir, jsonFilename);
      const mdFilepath = join(outputDir, mdFilename);

      // Write JSON report
      writeFileSync(jsonFilepath, JSON.stringify(uatReleaseReport, null, 2));

      // Write Markdown report
      const markdownReport =
        TemplateEngine.generateUATReleaseReport(uatReleaseReport);
      writeFileSync(mdFilepath, markdownReport);

      progress.stopProgressBar("✅ UAT release report generated successfully");

      // Display summary
      console.log("");
      console.log(chalk.green(`🎉 UAT Report for ${releaseNumber} generated!`));
      console.log("");
      console.log(chalk.cyan("🏢 Release Summary:"));
      console.log(chalk.white(`   📦 Release: ${releaseInfo.name}`));
      console.log(
        chalk.white(`   🔨 Build: ${buildInfo.number} (ID: ${buildInfo.id})`)
      );
      console.log(
        chalk.white(
          `   📅 Created: ${new Date(releaseInfo.createdOn).toLocaleString()}`
        )
      );
      console.log(chalk.white(`   👤 Created By: ${releaseInfo.createdBy}`));

      console.log("");
      console.log(chalk.cyan("🌍 Environment Status:"));
      environments.forEach((env) => {
        const statusIcon =
          env.status === "succeeded"
            ? "✅"
            : env.status === "failed"
            ? "❌"
            : "⏳";
        console.log(
          chalk.white(
            `   ${statusIcon} ${env.name}: ${env.status} (${env.duration})`
          )
        );
      });

      console.log("");
      console.log(chalk.green("📁 Generated Files:"));
      console.log(chalk.white(`   📄 ${jsonFilename}`));
      console.log(chalk.white(`   📄 ${mdFilename}`));
      console.log(chalk.gray(`   📍 Location: ${outputDir}`));

      console.log("");
      console.log(
        chalk.blue(
          `🔗 Release URL: https://dev.azure.com/fwcdev/Customer%20Services%20Platform/_release?releaseId=${releaseInfo.id}`
        )
      );
    } catch (error) {
      progress.fail("❌ Failed to generate UAT release report");
      console.log("");

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      MenuSystem.displayError(
        "UAT Release Report Generation Failed",
        errorMessage
      );
      console.log("");
      console.log(chalk.yellow("💡 Troubleshooting:"));
      console.log(
        chalk.white(
          "   • Ensure Azure DevOps authentication: az login --allow-no-subscriptions"
        )
      );
      console.log(
        chalk.white("   • Verify release number format (e.g., Release-490)")
      );
      console.log(chalk.white("   • Check that UAT deployment is complete"));
      console.log(
        chalk.white("   • Verify access to MyFWC - Release pipeline")
      );
    }
  }

  static async generateProductionReleaseReport(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Generating Production Release Report",
      "Production Release Report"
    );

    // Ask for release number
    console.log(chalk.cyan("🏭 Production Release Report Generator"));
    console.log("");
    console.log(
      chalk.white(
        "This will generate a comprehensive Production release and deployment report."
      )
    );
    console.log(
      chalk.gray(
        "Examples: 496, 490, 489 (will search for Release-496, Release-490, Release-489)"
      )
    );
    console.log("");

    const { releaseInput } = await inquirer.prompt([
      {
        type: "input",
        name: "releaseInput",
        message: "Enter the release number (just the number):",
        validate: (input: string) => {
          const trimmed = input.trim();
          if (!trimmed) {
            return "Release number is required";
          }
          // Check if it's a valid number or already formatted as Release-XXX
          if (!/^(Release-)?(\d+)$/.test(trimmed)) {
            return "Please enter a valid release number (e.g., 496 or Release-496)";
          }
          return true;
        },
      },
    ]);

    // Normalize the release number to ensure it starts with "Release-"
    const releaseNumber = releaseInput.trim().startsWith("Release-")
      ? releaseInput.trim()
      : `Release-${releaseInput.trim()}`;

    const progress = new CLIProgress("Generating Production release report");
    const totalSteps = 8; // Total number of steps in the process

    // Use progress bar for multi-step operation
    progress.startProgressBar(
      totalSteps,
      "🏭 Generating Production release report"
    );

    try {
      // Step 1: Configure Azure DevOps and verify authentication
      progress.updateProgress(1);
      await this.azureDevOpsService.configureDefaults();

      const authStatus = await this.azureDevOpsService.getDetailedAuthStatus();
      if (!authStatus.authenticated) {
        progress.failProgressBar("❌ Authentication failed");
        console.log("");
        const errorDetails = authStatus.error
          ? `\nError details: ${authStatus.error}`
          : "";

        MenuSystem.displayError(
          "Authentication required",
          `Azure CLI authentication is required to access Azure DevOps.${errorDetails}
          
Please try one of these authentication methods:
1. Azure AD login: az login --allow-no-subscriptions
2. Personal Access Token: az devops login
3. Check network connectivity to dev.azure.com

If you're behind a corporate firewall, you may need to configure proxy settings.`
        );
        return;
      }

      // Step 2: Get release information
      progress.updateProgress(2);
      let releaseInfo;
      try {
        releaseInfo = await this.azureDevOpsService.getReleaseByNumber(
          releaseNumber.trim()
        );
      } catch (error) {
        progress.stopProgressBar("❌ Release lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Release not found",
          error instanceof Error ? error.message : "Unknown error"
        );
        return;
      }

      // Step 3: Get associated build number and verify it exists
      progress.updateProgress(3);
      let buildNumber = releaseInfo.associatedBuild;

      // If we couldn't extract build number from release artifacts, try alternative method
      if (buildNumber === "Unknown") {
        console.log(
          "Build number not found in artifacts, trying alternative method..."
        );
        try {
          buildNumber = await this.azureDevOpsService.getBuildFromRelease(
            releaseInfo.id
          );
          console.log(`Found build using alternative method: ${buildNumber}`);
        } catch (error) {
          console.log(
            "Alternative method also failed:",
            error instanceof Error ? error.message : "Unknown error"
          );
        }
      }

      console.log(`Found associated build: ${buildNumber}`);

      if (buildNumber === "Unknown") {
        progress.stopProgressBar("❌ Build lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Associated build not found",
          `Could not determine the build number associated with ${releaseNumber}. Please check if the release has an associated build artifact.`
        );
        return;
      }

      let buildDetails;
      try {
        buildDetails = await this.azureDevOpsService.getBuildByNumber(
          buildNumber
        );
      } catch (error) {
        progress.stopProgressBar("❌ Build lookup failed");
        console.log("");
        MenuSystem.displayError(
          "Associated build not found",
          `Build ${buildNumber} associated with ${releaseNumber} not found`
        );
        return;
      }

      const buildInfo = this.azureDevOpsService.extractBuildInfo(buildDetails);

      // Step 4: Get release environments
      progress.updateProgress(4);
      const environments = await this.azureDevOpsService.getReleaseEnvironments(
        releaseInfo.id
      );

      // Check if Production deployment is complete
      const prodEnvironment = environments.find(
        (env) =>
          env.name.toLowerCase().includes("prod") ||
          env.name.toLowerCase().includes("production")
      );

      // For testing purposes, allow report generation even if Production isn't complete
      // but show a warning
      if (!prodEnvironment || prodEnvironment.status !== "succeeded") {
        console.log("");
        console.log(
          chalk.yellow("⚠️  Warning: Production deployment is not complete")
        );
        console.log(
          chalk.yellow(
            `   Production status: ${prodEnvironment?.status || "Not found"}`
          )
        );
        console.log(
          chalk.yellow("   Generating report anyway for testing purposes...")
        );
        console.log("");
      }

      // Step 5: Get release approvals
      progress.updateProgress(5);
      const approvals = await this.azureDevOpsService.getReleaseApprovals(
        releaseInfo.id
      );

      // Step 6: Extract health check results for the build
      progress.updateProgress(6);
      const healthCheck =
        await this.azureDevOpsService.extractHealthCheckResults(
          buildInfo.id,
          buildInfo.result
        );

      // Step 7: Gather test results and artifacts
      progress.updateProgress(7);
      const { testing, coverage } =
        await this.azureDevOpsService.extractAllTestResults(buildInfo.id);
      const artifacts = await this.azureDevOpsService.getBuildArtifacts(
        buildInfo.id
      );

      // Step 8: Generate report files
      progress.updateProgress(8);

      // Create Production release report data (reusing UATReleaseReport structure)
      const prodReleaseReport: UATReleaseReport = {
        release: releaseInfo,
        build: buildInfo,
        environments,
        approvals,
        healthCheck,
        testing,
        coverage,
        artifacts,
        generatedAt: new Date().toISOString(),
      };

      // Ensure output directory exists
      const outputDir = join(process.cwd(), "output");
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // Generate report files
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .split(".")[0];

      const jsonFilename = `prod-report-${releaseNumber.trim()}-${timestamp}.json`;
      const mdFilename = `prod-report-${releaseNumber.trim()}-${timestamp}.md`;
      const jsonFilepath = join(outputDir, jsonFilename);
      const mdFilepath = join(outputDir, mdFilename);

      // Write JSON report
      writeFileSync(jsonFilepath, JSON.stringify(prodReleaseReport, null, 2));

      // Write Markdown report using TemplateEngine
      const markdownReport =
        TemplateEngine.generateProductionReleaseReport(prodReleaseReport);
      writeFileSync(mdFilepath, markdownReport);

      progress.stopProgressBar(
        "✅ Production release report generated successfully"
      );

      // Display summary
      console.log("");
      console.log(
        chalk.green(`🎉 Production Report for ${releaseNumber} generated!`)
      );
      console.log("");
      console.log(chalk.cyan("🏭 Release Summary:"));
      console.log(chalk.white(`   📦 Release: ${releaseInfo.name}`));
      console.log(
        chalk.white(`   🔨 Build: ${buildInfo.number} (ID: ${buildInfo.id})`)
      );
      console.log(
        chalk.white(
          `   📅 Created: ${new Date(releaseInfo.createdOn).toLocaleString()}`
        )
      );
      console.log(chalk.white(`   👤 Created By: ${releaseInfo.createdBy}`));

      console.log("");
      console.log(chalk.cyan("🌍 Environment Status:"));
      environments.forEach((env) => {
        const statusIcon =
          env.status === "succeeded"
            ? "✅"
            : env.status === "failed"
            ? "❌"
            : "⏳";
        console.log(
          chalk.white(
            `   ${statusIcon} ${env.name}: ${env.status} (${env.duration})`
          )
        );
      });

      console.log("");
      console.log(chalk.green("📁 Generated Files:"));
      console.log(chalk.white(`   📄 ${jsonFilename}`));
      console.log(chalk.white(`   📄 ${mdFilename}`));
      console.log(chalk.gray(`   📍 Location: ${outputDir}`));

      console.log("");
      console.log(
        chalk.blue(
          `🔗 Release URL: https://dev.azure.com/fwcdev/Customer%20Services%20Platform/_release?releaseId=${releaseInfo.id}`
        )
      );
    } catch (error) {
      progress.fail("❌ Failed to generate Production release report");
      console.log("");

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      MenuSystem.displayError(
        "Production Release Report Generation Failed",
        errorMessage
      );
      console.log("");
      console.log(chalk.yellow("💡 Troubleshooting:"));
      console.log(
        chalk.white(
          "   • Ensure Azure DevOps authentication: az login --allow-no-subscriptions"
        )
      );
      console.log(
        chalk.white("   • Verify release number format (e.g., Release-490)")
      );
      console.log(
        chalk.white("   • Check that Production deployment is complete")
      );
      console.log(
        chalk.white("   • Verify access to MyFWC - Release pipeline")
      );
    }
  }

  static async cleanupReports(): Promise<void> {
    MenuSystem.displayOperationHeader(
      "Cleaning Up Previous Reports",
      "Reports Cleanup"
    );

    console.log(chalk.cyan("🧹 Report Cleanup Tool"));
    console.log("");
    console.log(
      chalk.white(
        "This will remove all previously generated report files from the output directory."
      )
    );
    console.log(chalk.gray("The .gitkeep file will be preserved."));
    console.log("");

    const outputDir = join(process.cwd(), "output");

    // Check if output directory exists
    if (!existsSync(outputDir)) {
      console.log(chalk.yellow("⚠️  No output directory found."));
      console.log("");
      console.log(chalk.gray("Nothing to clean up."));
      return;
    }

    const progress = new CLIProgress("Scanning output directory...");
    progress.start();

    try {
      // Get all files in output directory
      const files = readdirSync(outputDir);
      const reportFiles = files.filter(
        (file) =>
          file !== ".gitkeep" && statSync(join(outputDir, file)).isFile()
      );

      if (reportFiles.length === 0) {
        progress.succeed("✅ No report files found to clean up");
        console.log("");
        console.log(chalk.gray("The output directory is already clean."));
        return;
      }

      progress.updateText(`Found ${reportFiles.length} report files...`);

      // Show confirmation with file list
      progress.stop();
      console.log("");
      console.log(chalk.yellow(`📁 Found ${reportFiles.length} report files:`));
      reportFiles.forEach((file) => {
        console.log(chalk.gray(`   • ${file}`));
      });
      console.log("");

      const { confirmCleanup } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmCleanup",
          message: "Are you sure you want to delete these files?",
          default: false,
        },
      ]);

      if (!confirmCleanup) {
        console.log("");
        console.log(chalk.gray("🚫 Cleanup cancelled."));
        return;
      }

      // Delete files with progress
      const cleanupProgress = new CLIProgress("Removing report files");
      cleanupProgress.startProgressBar(
        reportFiles.length,
        "🗑️  Removing files"
      );

      for (let i = 0; i < reportFiles.length; i++) {
        const filePath = join(outputDir, reportFiles[i]);
        unlinkSync(filePath);
        cleanupProgress.updateProgress(i + 1);
      }

      cleanupProgress.stopProgressBar(
        "✅ All report files removed successfully"
      );

      console.log("");
      console.log(chalk.green("🎉 Cleanup completed!"));
      console.log(
        chalk.white(`   🗑️  Removed ${reportFiles.length} report files`)
      );
      console.log(chalk.white("   📄 .gitkeep file preserved"));
      console.log("");
      console.log(
        chalk.gray(
          "📍 Output directory is now clean and ready for new reports."
        )
      );
    } catch (error) {
      progress.fail("❌ Failed to clean up reports");
      console.log("");
      MenuSystem.displayError(
        "Cleanup failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
}
