export interface CLIOptions {
  subscription?: string;
  resourceGroup?: string;
  verbose?: boolean;
  output?: "json" | "table" | "yaml";
}

export interface AzureResourceSummary {
  totalResources: number;
  resourcesByType: Record<string, number>;
  resourcesByLocation: Record<string, number>;
  resourcesByResourceGroup: Record<string, number>;
}

export class OutputFormatter {
  static formatTable(data: any[], headers?: string[]): void {
    if (data.length === 0) {
      console.log("No data to display");
      return;
    }

    // Simple table formatting - you can enhance this with a proper table library
    const keys = headers || Object.keys(data[0]);

    // Header
    console.log(keys.join(" | "));
    console.log(keys.map(() => "---").join(" | "));

    // Rows
    data.forEach((item) => {
      console.log(keys.map((key) => item[key] || "N/A").join(" | "));
    });
  }

  static formatJson(data: any): void {
    console.log(JSON.stringify(data, null, 2));
  }

  static formatYaml(data: any): void {
    // Simple YAML-like output - you can use a proper YAML library
    console.log("---");
    this.printYamlObject(data, 0);
  }

  private static printYamlObject(obj: any, indent: number): void {
    const spaces = " ".repeat(indent);

    if (Array.isArray(obj)) {
      obj.forEach((item) => {
        console.log(`${spaces}- `);
        this.printYamlObject(item, indent + 2);
      });
    } else if (typeof obj === "object" && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === "object") {
          console.log(`${spaces}${key}:`);
          this.printYamlObject(value, indent + 2);
        } else {
          console.log(`${spaces}${key}: ${value}`);
        }
      });
    } else {
      console.log(`${spaces}${obj}`);
    }
  }
}
