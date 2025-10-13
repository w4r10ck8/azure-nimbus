import chalk from "chalk";
import { MenuSystem } from "../ui/menu-system.js";
import { CLIProgress } from "../core/progress.js";
import { AzureService } from "../../services/azure-service.js";
import {
  AzureDevOpsService,
  BuildReport,
} from "../../services/azure-devops-service.js";
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
        await this.azureDevOpsService.extractHealthCheckResults(buildInfo.id);

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
      const markdownReport = this.generateBuildMarkdownReport(buildReport);
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

  private static generateBuildMarkdownReport(buildReport: BuildReport): string {
    const { build, healthCheck, testing, coverage, artifacts } = buildReport;

    let report = `# Build & Deployment Report: ${build.number}

**Generated:** ${new Date(buildReport.generatedAt).toLocaleString()}  
**Build ID:** ${build.id}  
**Build URL:** [View in Azure DevOps](${build.buildUrl})

## 📋 Build Information

- **Build Number:** ${build.number}
- **Build ID:** ${build.id}
- **Status:** ${build.status}
- **Result:** ${build.result}
- **Start Time:** ${build.startTime}
- **Finish Time:** ${build.finishTime}
- **Duration:** ${build.duration}
- **Source Branch:** ${build.sourceBranch}
- **Requested By:** ${build.requestedBy}
- **Trigger:** ${build.triggerInfo}
- **Source Commit:** ${build.sourceCommit}

## 🏥 Health Check Results

### Code Quality & Security

- **Security Audit:** ${healthCheck.securityAudit}
- **Environment Validation:** ${healthCheck.environmentCheck}
- **Code Formatting (Prettier):** ${healthCheck.prettier}
- **Linting (ESLint):** ${healthCheck.eslint}
- **Type Checking (TypeScript):** ${healthCheck.typescript}
- **Build Status:** ${healthCheck.buildSuccess}

## 🧪 Test Results
`;

    if (testing.tests !== "No test results found") {
      report += `
- **Test Files:** ${testing.testFiles}
- **Tests:** ${testing.tests}
- **Duration:** ${testing.duration}

### Code Coverage

- **Statements:** ${coverage.statements}
- **Branches:** ${coverage.branches}
- **Functions:** ${coverage.functions}
- **Lines:** ${coverage.lines}
`;
    } else {
      report += `
- No test results available in this build
`;
    }

    report += `
## 📦 Build Artifacts

`;

    if (artifacts.length > 0) {
      artifacts.forEach((artifact) => {
        report += `- **${artifact.name}** (${artifact.type})`;
        if (artifact.size) {
          report += ` - ${artifact.size}`;
        }
        report += `\n`;
      });
    } else {
      report += `- No artifacts found\n`;
    }

    report += `
## 📊 Build Quality Assessment

### ✅ **Passed Checks**
`;

    // Add passed checks
    const checks = [
      { name: "Security Audit", status: healthCheck.securityAudit },
      { name: "Environment Check", status: healthCheck.environmentCheck },
      { name: "Code Formatting", status: healthCheck.prettier },
      { name: "Linting", status: healthCheck.eslint },
      { name: "Type Checking", status: healthCheck.typescript },
      { name: "Build", status: healthCheck.buildSuccess },
    ];

    const passedChecks = checks.filter((check) => check.status.includes("✅"));
    const failedChecks = checks.filter((check) => check.status.includes("❌"));
    const warningChecks = checks.filter((check) => check.status.includes("⚠️"));

    passedChecks.forEach((check) => {
      report += `- ${check.name}: ${check.status}\n`;
    });

    if (warningChecks.length > 0) {
      report += `
### ⚠️ **Warnings**
`;
      warningChecks.forEach((check) => {
        report += `- ${check.name}: ${check.status}\n`;
      });
    }

    if (failedChecks.length > 0) {
      report += `
### ❌ **Failed Checks**
`;
      failedChecks.forEach((check) => {
        report += `- ${check.name}: ${check.status}\n`;
      });
    }

    report += `
## 🚀 Deployment Readiness

**Overall Status:** ${
      build.result === "succeeded" && failedChecks.length === 0
        ? "✅ Ready for Deployment"
        : "⚠️ Review Required"
    }

### Pre-Deployment Checklist
- [ ] All health checks passed
- [ ] Test coverage meets requirements
- [ ] No security vulnerabilities found
- [ ] Code quality standards met
- [ ] Build artifacts generated successfully
- [ ] Release notes prepared
- [ ] Deployment plan reviewed

## 🔗 Additional Resources

- **Azure DevOps Build:** [Build ${build.number}](${build.buildUrl})
- **Build Logs:** [View Logs](${build.buildUrl}&view=logs)
- **Test Results:** [View Tests](${
      build.buildUrl
    }&view=ms.vss-test-web.build-test-results-tab)

---
*Report generated on ${new Date(
      buildReport.generatedAt
    ).toLocaleString()} by Azure Report CLI*
`;

    return report;
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
