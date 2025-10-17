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
    console.log(chalk.gray("Examples: Release-490, Release-489"));
    console.log("");

    const { releaseNumber } = await inquirer.prompt([
      {
        type: "input",
        name: "releaseNumber",
        message: "Enter the release number:",
        validate: (input: string) => {
          if (!input.trim()) {
            return "Release number is required";
          }
          return true;
        },
      },
    ]);

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
      const markdownReport = this.generateUATMarkdownReport(uatReleaseReport);
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

  private static generateUATMarkdownReport(
    uatReport: UATReleaseReport
  ): string {
    const { release, build, environments, approvals } = uatReport;

    // Find UAT environment deployment date or use release creation date
    const uatEnv = environments.find((env: EnvironmentInfo) =>
      env.name.toLowerCase().includes("uat")
    );
    const deploymentDate =
      uatEnv?.deploymentCompletedTime &&
      uatEnv.deploymentCompletedTime !== "N/A"
        ? new Date(uatEnv.deploymentCompletedTime).toLocaleDateString("en-GB")
        : new Date(release.createdOn).toLocaleDateString("en-GB");

    // Determine a sensible target branch (prefer build.sourceBranch, fallback to release.targetBranch)
    const rawBranch =
      (build?.sourceBranch && build.sourceBranch) ||
      (release?.targetBranch && release.targetBranch) ||
      "";
    const targetBranch = rawBranch
      ? rawBranch.replace(/^refs\/heads\//, "")
      : "Unknown";

    let report = `# ${release.name}

**${release.name}** was deployed from DEV into UAT on ${deploymentDate}

[[_TOC_]]

## 🚀 Release Summary
- **Release Number:** ${release.name}
- **Associated Build:** ${build.number}
- **Target Branch:** \`${targetBranch}\`
- **Created By:** ${release.createdBy}
- **Created Date:** ${new Date(release.createdOn).toLocaleDateString("en-GB")}
- **Deployment Path:** MyDev → MyUAT

## 🌍 Environment Status & Approvals
`;

    // Only include MY.DEV and MY.UAT in the environment section
    const envMyDev = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("my.dev") ||
        e.name.toLowerCase().includes("mydev")
    );
    const envMyUat = environments.find(
      (e: EnvironmentInfo) =>
        e.name.toLowerCase().includes("uat") &&
        !e.name.toLowerCase().includes("stage")
    );

    // Keep only MY.DEV/DEV and MY.UAT approvals
    const relevantApprovals = approvals.filter((a) => {
      const env = a.environmentName?.toUpperCase();
      return (
        env === "MY.DEV" || env === "DEV" || env === "MY.UAT" || env === "UAT"
      );
    });

    // Normalize environment names and group
    const approvalsByEnv = new Map<string, ApprovalInfo[]>();
    relevantApprovals.forEach((approval) => {
      let envName = approval.environmentName?.toUpperCase() || "UNKNOWN";
      if (envName === "DEV") envName = "MY.DEV";
      if (envName === "UAT") envName = "MY.UAT";
      if (!approvalsByEnv.has(envName)) approvalsByEnv.set(envName, []);
      approvalsByEnv.get(envName)!.push(approval);
    });

    const generateEnvSection = (
      env: EnvironmentInfo | undefined,
      displayName: string
    ) => {
      const statusIcon =
        env?.status === "succeeded"
          ? "✅"
          : env?.status === "failed"
          ? "❌"
          : "⏳";

      report += `### ${displayName}

- **Status:** ${statusIcon} ${env?.status || "Not found"}

| Approval Type | Approver | Status | Approval Time |
|---------------|----------|--------|---------------|`;

      const envApprovals = approvalsByEnv.get(displayName) || [];
      const preApprovals = envApprovals.filter((a) => a.approvalType === "preDeploy");
      const postApprovals = envApprovals.filter((a) => a.approvalType === "postDeploy");

      // Pre-deployment approval
      if (preApprovals.length === 0) {
        report += `
| Pre-deployment | Pending | - | - |`;
      } else {
        // Find approved approvals first, then fall back to latest if none approved
        const approvedApprovals = preApprovals.filter(a => a.status === "approved");
        let selectedApproval;
        
        if (approvedApprovals.length > 0) {
          selectedApproval = approvedApprovals.sort(
            (a, b) => new Date(a.modifiedOn).getTime() - new Date(b.modifiedOn).getTime()
          )[approvedApprovals.length - 1];
        } else {
          selectedApproval = preApprovals.sort(
            (a, b) => new Date(a.modifiedOn).getTime() - new Date(b.modifiedOn).getTime()
          )[preApprovals.length - 1];
        }
        
        if (selectedApproval.status === "pending") {
          report += `
| Pre-deployment | Pending | ⏳ pending | - |`;
        } else {
          const approvalTime = new Date(selectedApproval.modifiedOn).toLocaleString("en-GB");
          const statusEmoji = selectedApproval.status === "approved" ? "✅" : 
                             selectedApproval.status === "rejected" ? "❌" : "⚪";
          
          report += `
| Pre-deployment | ${selectedApproval.approver} | ${statusEmoji} ${selectedApproval.status} | ${approvalTime} |`;
        }
      }

      // Post-deployment approval
      if (postApprovals.length === 0) {
        report += `
| Post-deployment | Pending | - | - |`;
      } else {
        const approvedPostApprovals = postApprovals.filter(a => a.status === "approved");
        let selectedPostApproval;
        
        if (approvedPostApprovals.length > 0) {
          selectedPostApproval = approvedPostApprovals.sort(
            (a, b) => new Date(a.modifiedOn).getTime() - new Date(b.modifiedOn).getTime()
          )[approvedPostApprovals.length - 1];
        } else {
          selectedPostApproval = postApprovals.sort(
            (a, b) => new Date(a.modifiedOn).getTime() - new Date(b.modifiedOn).getTime()
          )[postApprovals.length - 1];
        }
        
        if (selectedPostApproval.status === "pending") {
          report += `
| Post-deployment | Pending | ⏳ pending | - |`;
        } else {
          const postApprovalTime = new Date(selectedPostApproval.modifiedOn).toLocaleString("en-GB");
          const postStatusEmoji = selectedPostApproval.status === "approved" ? "✅" : 
                                 selectedPostApproval.status === "rejected" ? "❌" : "⚪";
          
          report += `
| Post-deployment | ${selectedPostApproval.approver} | ${postStatusEmoji} ${selectedPostApproval.status} | ${postApprovalTime} |`;
        }
      }

      report += `

`;
    };

    generateEnvSection(envMyDev, "MY.DEV");
    generateEnvSection(envMyUat, "MY.UAT");

    // Add manual sections with prominent placeholders
    report += `## Stories
<!-- TODO: Add stories manually -->

## Defects Fixed
<!-- TODO: Add defects fixed manually -->

## Other Changes / Notes
<!-- TODO: Add other changes/notes manually -->

## Defects noted after Deployment
<!-- TODO: Add defects noted after deployment manually -->

## Testing
<!-- TODO: Add testing information manually -->

### Testing Results
<!-- TODO: Add testing results manually -->

### Additional Ad-hoc Testing

#### Stories with existing Test Cases
<!-- TODO: Add stories with existing test cases manually -->

#### Stories without detailed Test Cases
<!-- TODO: Add stories without detailed test cases manually -->

---
# Build & Deployment Report: ${build.number}

**Generated:** ${new Date(uatReport.generatedAt).toLocaleString()}  
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
- **Source Branch:** \`${build.sourceBranch}\`
- **Requested By:** ${build.requestedBy}
- **Trigger:** ${build.triggerInfo}
- **Trigger PR:** ${build.triggerPR}
- **Source Commit:** ${build.sourceCommit}

## 🏥 Health Check Results

### Code Quality & Security

- **Security Audit:** ${uatReport.healthCheck.securityAudit}
- **Environment Validation:** ${uatReport.healthCheck.environmentCheck}
- **Code Formatting (Prettier):** ${uatReport.healthCheck.prettier}
- **Linting (ESLint):** ${uatReport.healthCheck.eslint}
- **Type Checking (TypeScript):** ${uatReport.healthCheck.typescript}
- **Build Status:** ${uatReport.healthCheck.buildSuccess}

## 🧪 Test Results
`;

    if (uatReport.testing.tests !== "No test results found") {
      report += `
- **Test Files:** ${uatReport.testing.testFiles}
- **Tests:** ${uatReport.testing.tests}
- **Duration:** ${uatReport.testing.duration}

### Code Coverage

- **Statements:** ${uatReport.coverage.statements}
- **Branches:** ${uatReport.coverage.branches}
- **Functions:** ${uatReport.coverage.functions}
- **Lines:** ${uatReport.coverage.lines}
`;
    } else {
      report += `
- No test results available in this build
`;
    }

    report += `
## 📦 Build Artifacts

`;

    if (uatReport.artifacts.length > 0) {
      uatReport.artifacts.forEach((artifact: BuildArtifact) => {
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
## 🔗 Additional Resources

- **Azure DevOps Build:** [Build ${build.number}](${build.buildUrl})
- **Azure DevOps Release:** [${
      release.name
    }](https://dev.azure.com/fwcdev/Customer%20Services%20Platform/_release?releaseId=${
      release.id
    })
- **Build Logs:** [View Logs](${build.buildUrl}&view=logs)
- **Test Results:** [View Tests](${
      build.buildUrl
    }&view=ms.vss-test-web.build-test-results-tab)

---
*Report generated on ${new Date(
      uatReport.generatedAt
    ).toLocaleString()} by Azure Nimbus CLI*
`;

    return report;
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
- **Source Branch:** \`${build.sourceBranch}\`
- **Requested By:** ${build.requestedBy}
- **Trigger:** ${build.triggerInfo}
- **Trigger PR:** ${build.triggerPR}
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
## 🔗 Additional Resources

- **Azure DevOps Build:** [Build ${build.number}](${build.buildUrl})
- **Build Logs:** [View Logs](${build.buildUrl}&view=logs)
- **Test Results:** [View Tests](${
      build.buildUrl
    }&view=ms.vss-test-web.build-test-results-tab)

---
*Report generated on ${new Date(
      buildReport.generatedAt
    ).toLocaleString()} by Azure Nimbus CLI*
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
