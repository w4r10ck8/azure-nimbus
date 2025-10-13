# Azure Report CLI

A powerful command-line interface tool for retrieving and reporting information from Azure resources.

## Features

- 🔍 List Azure subscriptions
- 📊 Retrieve resource information
- 🎨 Beautiful CLI output with progress indicators
- 📈 Multiple output formats (JSON, Table, YAML)
- 🔐 Secure Azure authentication
- ⚡ Built with TypeScript and Bun for performance

## Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Azure CLI installed and authenticated, or appropriate Azure credentials configured
- Node.js 18+ (for Azure SDK compatibility)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd azure-report-cli
```

2. Install dependencies:

```bash
bun install
```

3. Build the project:

```bash
bun run build
```

## Usage

### List Subscriptions

```bash
bun run start subscriptions
```

### List Resources

```bash
# List resources in default subscription
bun run start resources

# List resources in specific subscription
bun run start resources --subscription <subscription-id>
```

## Development

### Running in Development Mode

```bash
bun run dev
```

### Building the Project

```bash
bun run build
```

### Available Scripts

- `bun run dev` - Run in development mode with hot reload
- `bun run build` - Build the TypeScript project
- `bun run start` - Run the built CLI
- `bun run clean` - Clean the dist directory

## Authentication

The CLI uses Azure Default Credential, which will attempt to authenticate using:

1. Environment variables (if configured)
2. Managed Identity (if running on Azure)
3. Azure CLI (if logged in)
4. Visual Studio Code Azure Account extension
5. Interactive browser authentication

Make sure you're authenticated with Azure CLI:

```bash
az login
```

## Configuration

The CLI supports the following options:

- `--subscription <id>` - Specify Azure subscription ID
- `--verbose` - Enable verbose output
- `--output <format>` - Output format (json, table, yaml)

## Project Structure

```
src/
├── index.ts              # Main CLI entry point
├── services/
│   └── azureService.ts   # Azure SDK service wrapper
└── utils/
    ├── progress.ts       # CLI progress utilities
    ├── formatter.ts      # Output formatting utilities
    └── logger.ts         # Logging utilities
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
