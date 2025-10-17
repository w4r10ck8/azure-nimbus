import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface BuildInfo {
  id: string;
  number: string;
  status: string;
  result: string;
  startTime: string;
  finishTime: string;
  duration: string;
  sourceBranch: string;
  requestedBy: string;
  triggerInfo: string;
  sourceCommit: string;
  buildUrl: string;
}

export interface HealthCheckResults {
  securityAudit: string;
  environmentCheck: string;
  prettier: string;
  eslint: string;
  typescript: string;
  buildSuccess: string;
}

export interface TestResults {
  testFiles: string;
  tests: string;
  duration: string;
}

export interface CoverageResults {
  statements: string;
  branches: string;
  functions: string;
  lines: string;
}

export interface BuildArtifact {
  name: string;
  type: string;
  size?: string;
}

export interface BuildReport {
  build: BuildInfo;
  healthCheck: HealthCheckResults;
  testing: TestResults;
  coverage: CoverageResults;
  artifacts: BuildArtifact[];
  generatedAt: string;
}

export class AzureDevOpsService {
  private readonly orgUrl = "https://dev.azure.com/fwcdev";
  private readonly project = "Customer Services Platform";
  private readonly projectId = "448296df-0774-48cb-b859-63c7df4a0284";

  async configureDefaults(): Promise<void> {
    await execAsync(
      `az devops configure --defaults organization="${this.orgUrl}" project="${this.project}"`
    );
  }

  async getAccessToken(): Promise<string> {
    const { stdout } = await execAsync(
      "az account get-access-token --query accessToken -o tsv"
    );
    return stdout.trim();
  }

  async verifyAuthentication(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch {
      return false;
    }
  }

  async getBuildById(buildId: string): Promise<any> {
    try {
      const { stdout } = await execAsync(
        `az pipelines runs show --id "${buildId}" --output json`
      );
      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Build ID ${buildId} not found or invalid`);
    }
  }

  async getBuildByNumber(buildNumber: string): Promise<any> {
    try {
      // Extract date from build number (YYYYMMDD format) for targeted search
      const dateMatch = buildNumber.match(/^(\d{8})\./);
      if (!dateMatch) {
        throw new Error(`Invalid build number format: ${buildNumber}. Expected format: YYYYMMDD.X`);
      }

      const buildDate = dateMatch[1];
      const year = buildDate.substring(0, 4);
      const month = buildDate.substring(4, 6);
      const day = buildDate.substring(6, 8);
      
      // Search builds from that specific date
      const fromDate = `${year}-${month}-${day}`;
      const toDate = new Date(Date.parse(fromDate) + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log(`Searching for build ${buildNumber} from date range: ${fromDate} to ${toDate}`);
      
      try {
        const { stdout: dateFilteredStdout } = await execAsync(
          `az pipelines build list --min-time "${fromDate}" --max-time "${toDate}" --output json`,
          { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
        );
        const dateFilteredBuilds = JSON.parse(dateFilteredStdout);
        
        const matchingBuilds = dateFilteredBuilds.filter(
          (build: any) => build.buildNumber === buildNumber
        );

        console.log(`Found ${matchingBuilds.length} builds with number ${buildNumber}`);
        matchingBuilds.forEach((build: any, index: number) => {
          console.log(`  ${index + 1}. ID: ${build.id}, Requested by: ${build.requestedFor?.displayName || 'Unknown'}, Branch: ${build.sourceBranch}`);
        });

        if (matchingBuilds.length === 0) {
          // If not found in that date, try a broader search around that date
          const dayBefore = new Date(Date.parse(fromDate) - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const dayAfter = new Date(Date.parse(fromDate) + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          console.log(`Expanding search range: ${dayBefore} to ${dayAfter}`);
          
          const { stdout: expandedStdout } = await execAsync(
            `az pipelines build list --min-time "${dayBefore}" --max-time "${dayAfter}" --output json`,
            { maxBuffer: 1024 * 1024 * 10 }
          );
          const expandedBuilds = JSON.parse(expandedStdout);
          
          const expandedMatching = expandedBuilds.filter(
            (build: any) => build.buildNumber === buildNumber
          );

          console.log(`Found ${expandedMatching.length} builds with number ${buildNumber} in expanded search`);
          expandedMatching.forEach((build: any, index: number) => {
            console.log(`  ${index + 1}. ID: ${build.id}, Requested by: ${build.requestedFor?.displayName || 'Unknown'}, Branch: ${build.sourceBranch}`);
          });

          if (expandedMatching.length === 0) {
            throw new Error(`Build number ${buildNumber} not found in date range ${dayBefore} to ${dayAfter}. Please verify the build number exists.`);
          }
          
          // Select the best build from expanded matching
          let selectedBuild = expandedMatching[0];
          
          if (expandedMatching.length > 1) {
            // Priority 1: Succeeded builds
            const succeededBuilds = expandedMatching.filter((build: any) => build.result === 'succeeded');
            if (succeededBuilds.length > 0) {
              selectedBuild = succeededBuilds[0];
              
              // Priority 2: Main/release branches within succeeded builds
              const mainBranchBuilds = succeededBuilds.filter((build: any) => 
                build.sourceBranch && (
                  build.sourceBranch.includes('main') || 
                  build.sourceBranch.includes('master') || 
                  build.sourceBranch.includes('release/')
                )
              );
              if (mainBranchBuilds.length > 0) {
                selectedBuild = mainBranchBuilds[0];
              }
            }
          }
          
          console.log(`Selected build: ${selectedBuild.buildNumber} (ID: ${selectedBuild.id}) - ${selectedBuild.requestedFor?.displayName || 'Unknown'} - ${selectedBuild.result}`);
          return selectedBuild;
        }

        // Select the best build from matching results
        let selectedBuild = matchingBuilds[0];
        
        if (matchingBuilds.length > 1) {
          // Priority 1: Succeeded builds
          const succeededBuilds = matchingBuilds.filter((build: any) => build.result === 'succeeded');
          if (succeededBuilds.length > 0) {
            selectedBuild = succeededBuilds[0];
            
            // Priority 2: Main/release branches within succeeded builds
            const mainBranchBuilds = succeededBuilds.filter((build: any) => 
              build.sourceBranch && (
                build.sourceBranch.includes('main') || 
                build.sourceBranch.includes('master') || 
                build.sourceBranch.includes('release/')
              )
            );
            if (mainBranchBuilds.length > 0) {
              selectedBuild = mainBranchBuilds[0];
            }
          }
        }
        
        console.log(`Selected build: ${selectedBuild.buildNumber} (ID: ${selectedBuild.id}) - ${selectedBuild.requestedFor?.displayName || 'Unknown'} - ${selectedBuild.result}`);
        
        return selectedBuild;
        
      } catch (dateError) {
        // If date filtering fails completely, fall back to recent builds search
        console.warn("Date filtering failed, searching recent builds...");
        const { stdout: recentStdout } = await execAsync(
          "az pipelines build list --top 100 --output json",
          { maxBuffer: 1024 * 1024 * 10 }
        );
        const recentBuilds = JSON.parse(recentStdout);
        const matchingBuilds = recentBuilds.filter(
          (build: any) => build.buildNumber === buildNumber
        );

        if (matchingBuilds.length === 0) {
          throw new Error(`Build number ${buildNumber} not found in recent builds. The build may be older or you may not have access to it.`);
        }

        // Select the best build from recent builds
        let selectedBuild = matchingBuilds[0];
        
        if (matchingBuilds.length > 1) {
          // Priority 1: Succeeded builds
          const succeededBuilds = matchingBuilds.filter((build: any) => build.result === 'succeeded');
          if (succeededBuilds.length > 0) {
            selectedBuild = succeededBuilds[0];
            
            // Priority 2: Main/release branches within succeeded builds
            const mainBranchBuilds = succeededBuilds.filter((build: any) => 
              build.sourceBranch && (
                build.sourceBranch.includes('main') || 
                build.sourceBranch.includes('master') || 
                build.sourceBranch.includes('release/')
              )
            );
            if (mainBranchBuilds.length > 0) {
              selectedBuild = mainBranchBuilds[0];
            }
          }
        }

        console.log(`Selected build: ${selectedBuild.buildNumber} (ID: ${selectedBuild.id}) - ${selectedBuild.requestedFor?.displayName || 'Unknown'} - ${selectedBuild.result}`);
        return selectedBuild;
      }
    } catch (error) {
      throw new Error(`Failed to find build number ${buildNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getBuildTimeline(buildId: string): Promise<any> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://dev.azure.com/fwcdev/${this.projectId}/_apis/build/builds/${buildId}/timeline?api-version=6.0`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${token}`).toString("base64")}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get build timeline: ${response.statusText}`);
    }

    return await response.json();
  }

  async getBuildLog(buildId: string, logId: string): Promise<string> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `https://dev.azure.com/fwcdev/${this.projectId}/_apis/build/builds/${buildId}/logs/${logId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${token}`).toString("base64")}`,
          Accept: "text/plain",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get build log: ${response.statusText}`);
    }

    return await response.text();
  }

  async getBuildArtifacts(buildId: string): Promise<BuildArtifact[]> {
    try {
      const { stdout } = await execAsync(
        `az pipelines runs artifact list --run-id "${buildId}" --output json`
      );
      const artifacts = JSON.parse(stdout);

      return artifacts.map((artifact: any) => ({
        name: artifact.name,
        type: artifact.resource.type,
        size: artifact.resource.properties?.artifactsize
          ? `${(
              artifact.resource.properties.artifactsize /
              1024 /
              1024
            ).toFixed(1)} MB`
          : undefined,
      }));
    } catch {
      return [];
    }
  }

  extractBuildInfo(buildDetails: any): BuildInfo {
    // Log the raw build details for debugging
    console.log(`\nExtracting info from build: ${buildDetails.buildNumber} (ID: ${buildDetails.id})`);
    console.log(`Raw requestedFor: ${JSON.stringify(buildDetails.requestedFor)}`);
    console.log(`Raw sourceBranch: ${buildDetails.sourceBranch}`);
    
    const startTime = buildDetails.startTime || "N/A";
    const finishTime = buildDetails.finishTime || "N/A";

    let duration = "N/A";
    if (startTime !== "N/A" && finishTime !== "N/A") {
      const startEpoch = new Date(startTime).getTime();
      const finishEpoch = new Date(finishTime).getTime();
      const durationMs = finishEpoch - startEpoch;
      const durationSecs = Math.floor(durationMs / 1000);
      const minutes = Math.floor(durationSecs / 60);
      const seconds = durationSecs % 60;
      duration = `${durationSecs}s (${minutes}m ${seconds}s)`;
    }

    // Extract source branch - handle PR branches properly
    let sourceBranch = buildDetails.sourceBranch || "N/A";
    if (sourceBranch.includes("refs/pull/")) {
      // Extract PR number from refs/pull/XXXX/merge format
      const prMatch = sourceBranch.match(/refs\/pull\/(\d+)\/merge/);
      if (prMatch) {
        sourceBranch = `PR #${prMatch[1]}`;
      }
    } else if (sourceBranch.includes("refs/heads/")) {
      // Clean up branch names by removing refs/heads/ prefix
      sourceBranch = sourceBranch.replace("refs/heads/", "");
    }

    return {
      id: buildDetails.id || "N/A",
      number: buildDetails.buildNumber || "N/A",
      status: buildDetails.status || "N/A",
      result: buildDetails.result || "N/A",
      startTime,
      finishTime,
      duration,
      sourceBranch,
      requestedBy:
        buildDetails.requestedFor?.displayName ||
        buildDetails.requestedBy?.displayName ||
        buildDetails.requestedFor?.name ||
        buildDetails.requestedBy?.name ||
        "N/A",
      triggerInfo: buildDetails.triggerInfo?.["ci.message"] || buildDetails.reason || "N/A",
      sourceCommit: buildDetails.sourceVersion || "N/A",
      buildUrl: `https://dev.azure.com/fwcdev/Customer%20Services%20Platform/_build/results?buildId=${buildDetails.id}`,
    };
  }

  async extractHealthCheckResults(
    buildId: string
  ): Promise<HealthCheckResults> {
    const results: HealthCheckResults = {
      securityAudit: "ℹ️ Security audit not found",
      environmentCheck: "ℹ️ Environment check not found",
      prettier: "ℹ️ Prettier check not found",
      eslint: "ℹ️ ESLint check not found",
      typescript: "ℹ️ TypeScript check not found",
      buildSuccess: "ℹ️ Build status unknown",
    };

    try {
      const timeline = await this.getBuildTimeline(buildId);
      const logRecords =
        timeline.records?.filter((record: any) => record.log?.id) || [];

      for (const record of logRecords) {
        try {
          const logContent = await this.getBuildLog(buildId, record.log.id);
          this.processLogForHealthChecks(logContent, results);
        } catch {
          // Continue with other logs if one fails
        }
      }

      // If no specific health check results found, try common log IDs
      if (results.securityAudit.includes("not found")) {
        for (const logId of ["19", "18", "20", "34"]) {
          try {
            const logContent = await this.getBuildLog(buildId, logId);
            this.processLogForHealthChecks(logContent, results);
          } catch {
            // Continue trying other log IDs
          }
        }
      }
    } catch {
      // Return default results if timeline access fails
    }

    return results;
  }

  private processLogForHealthChecks(
    logContent: string,
    results: HealthCheckResults
  ): void {
    // Security audit (npm audit)
    if (logContent.includes("npm audit")) {
      if (logContent.includes("found 0 vulnerabilities")) {
        results.securityAudit = "✅ No vulnerabilities found";
      } else {
        const vulnMatch = logContent.match(/(\d+) vulnerabilities?/);
        results.securityAudit = vulnMatch
          ? `⚠️ ${vulnMatch[1]} vulnerabilities found`
          : "⚠️ Vulnerabilities detected";
      }
    }

    // Environment check
    if (
      logContent.includes("env") &&
      (logContent.includes("up to date") || logContent.includes("Check"))
    ) {
      results.environmentCheck =
        logContent.includes("succeeded") || logContent.includes("✅")
          ? "✅ Environment variables validated"
          : "❌ Environment validation failed";
    }

    // Prettier check
    if (logContent.includes("prettier")) {
      results.prettier =
        logContent.includes("All matched files use Prettier code style") ||
        !logContent.includes("error")
          ? "✅ Code formatting validated"
          : "❌ Code formatting issues found";
    }

    // ESLint check
    if (logContent.includes("eslint")) {
      if (
        logContent.includes("0 errors, 0 warnings") ||
        (!logContent.includes("error") && !logContent.includes("warning"))
      ) {
        results.eslint = "✅ No linting errors";
      } else {
        const errorMatch = logContent.match(/(\d+) errors?/);
        const warningMatch = logContent.match(/(\d+) warnings?/);
        results.eslint = `⚠️ ${errorMatch?.[1] || 0} errors, ${
          warningMatch?.[1] || 0
        } warnings`;
      }
    }

    // TypeScript check
    if (
      logContent.includes("tsc") ||
      logContent.includes("typecheck") ||
      logContent.includes("TypeScript")
    ) {
      results.typescript =
        logContent.includes("Found 0 errors") || !logContent.includes("error")
          ? "✅ No TypeScript errors"
          : "❌ TypeScript errors found";
    }

    // Build success
    if (logContent.includes("succeeded")) {
      results.buildSuccess = "✅ Build completed successfully";
    } else if (logContent.includes("failed")) {
      results.buildSuccess = "❌ Build failed";
    }
  }

  extractTestResults(logContent: string): {
    testing: TestResults;
    coverage: CoverageResults;
  } {
    const testing: TestResults = {
      testFiles: "No test results found",
      tests: "No test results found",
      duration: "N/A",
    };

    const coverage: CoverageResults = {
      statements: "N/A",
      branches: "N/A",
      functions: "N/A",
      lines: "N/A",
    };

    // Test results (Vitest)
    const testFilesMatch = logContent.match(/Test Files.*passed.*skipped/);
    const testsMatch = logContent.match(/Tests.*passed.*skipped/);
    const durationMatch = logContent.match(/Duration.*s/);

    if (testFilesMatch) testing.testFiles = testFilesMatch[0];
    if (testsMatch) testing.tests = testsMatch[0];
    if (durationMatch) testing.duration = durationMatch[0];

    // Coverage information
    if (logContent.includes("Coverage summary")) {
      // Match patterns like "Statements   : 46.35% ( 17478/37706 )"
      const statementsMatch = logContent.match(
        /Statements\s*:\s*(\d+\.?\d*%\s*\([^)]+\))/
      );
      const branchesMatch = logContent.match(
        /Branches\s*:\s*(\d+\.?\d*%\s*\([^)]+\))/
      );
      const functionsMatch = logContent.match(
        /Functions\s*:\s*(\d+\.?\d*%\s*\([^)]+\))/
      );
      const linesMatch = logContent.match(
        /Lines\s*:\s*(\d+\.?\d*%\s*\([^)]+\))/
      );

      if (statementsMatch) coverage.statements = statementsMatch[1].trim();
      if (branchesMatch) coverage.branches = branchesMatch[1].trim();
      if (functionsMatch) coverage.functions = functionsMatch[1].trim();
      if (linesMatch) coverage.lines = linesMatch[1].trim();
    }

    return { testing, coverage };
  }

  async extractAllTestResults(
    buildId: string
  ): Promise<{ testing: TestResults; coverage: CoverageResults }> {
    try {
      const timeline = await this.getBuildTimeline(buildId);
      const logRecords =
        timeline.records?.filter((record: any) => record.log?.id) || [];

      // Look for test results in all logs
      for (const record of logRecords) {
        try {
          const logContent = await this.getBuildLog(buildId, record.log.id);
          if (
            logContent.includes("Test Files") &&
            logContent.includes("passed")
          ) {
            return this.extractTestResults(logContent);
          }
        } catch {
          // Continue with other logs
        }
      }

      // Try common test log IDs if not found in timeline
      for (const logId of ["19", "18", "20", "34"]) {
        try {
          const logContent = await this.getBuildLog(buildId, logId);
          if (
            logContent.includes("Test Files") &&
            logContent.includes("passed")
          ) {
            return this.extractTestResults(logContent);
          }
        } catch {
          // Continue trying
        }
      }
    } catch {
      // Return defaults if all attempts fail
    }

    return this.extractTestResults("");
  }
}
