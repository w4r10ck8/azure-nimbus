# Development Guide

## Getting Started

Your Azure Report CLI project has been successfully set up! Here's what you need to know:

## Project Structure

```
azure-report-cli/
├── src/
│   ├── index.ts              # Main CLI entry point with commands
│   ├── services/
│   │   └── azureService.ts   # Azure SDK integration service
│   └── utils/
│       ├── progress.ts       # CLI progress bars and spinners
│       ├── formatter.ts      # Output formatting utilities
│       └── logger.ts         # Logging utilities
├── dist/                     # Compiled JavaScript output
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

## Available Scripts

- `bun run dev` - Run in development mode with hot reload
- `bun run build` - Build the TypeScript project
- `bun run start` - Run the compiled CLI
- `bun run clean` - Clean the dist directory
- `bun run start test` - Test CLI functionality (no Azure auth needed)

## CLI Commands

### Test Command (No Auth Required)

```bash
bun run start test
```

This command tests basic CLI functionality without requiring Azure authentication.

### Azure Commands (Require Auth)

```bash
# List all subscriptions
bun run start subscriptions

# List resources in default subscription
bun run start resources

# List resources in specific subscription
bun run start resources --subscription <subscription-id>
```

## Development Workflow

1. **Make changes** to TypeScript files in the `src/` directory
2. **Build** the project: `bun run build`
3. **Test** your changes: `bun run start test`
4. **Run Azure commands** (after authentication): `bun run start subscriptions`

## Adding New Commands

To add new CLI commands, edit `src/index.ts`:

```typescript
program
  .command("your-command")
  .description("Description of your command")
  .option("-o, --option <value>", "Command option")
  .action(async (options) => {
    try {
      const progress = new CLIProgress("Processing...");
      progress.start();

      // Your command logic here

      progress.succeed("Command completed!");
    } catch (error) {
      console.error(chalk.red("❌ Error:", error.message));
      process.exit(1);
    }
  });
```

## Azure Authentication

Before using Azure commands, authenticate with:

```bash
az login
```

The CLI uses Azure Default Credential which will try these methods in order:

1. Environment variables
2. Managed Identity (if on Azure)
3. Azure CLI credentials
4. VS Code Azure extension
5. Interactive browser login

## Key Dependencies

- **Commander.js** - CLI framework
- **Chalk** - Terminal colors
- **Ora** - Elegant terminal spinners
- **cli-progress** - Progress bars
- **Azure SDK** - Azure API integration
- **TypeScript** - Type safety and modern JavaScript features

## Next Steps

1. **Test the basic CLI**: `bun run start test`
2. **Authenticate with Azure**: `az login`
3. **Try Azure commands**: `bun run start subscriptions`
4. **Add your own commands** by editing `src/index.ts`
5. **Extend Azure functionality** by adding methods to `src/services/azureService.ts`

## Tips

- Use the progress utilities in `src/utils/progress.ts` for better UX
- Add proper error handling for all Azure operations
- Use TypeScript interfaces for better type safety
- Check `src/utils/formatter.ts` for output formatting options

Happy coding! 🚀
