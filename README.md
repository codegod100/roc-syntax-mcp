# Roc Syntax MCP Server

An MCP (Model Context Protocol) server that provides AI agents with access to Roc programming language syntax reference.

## What is this?

When an AI agent connects to this MCP server, it can query Roc syntax examples and learn valid Roc language constructs. This is useful for AI assistants that need to write or understand Roc code.

## Installation

```bash
cd mcp
npm install
```

## Usage

### Running the server

The server uses stdio transport, which is the standard way MCP servers communicate with clients:

```bash
# Development mode (uses tsx for hot reloading)
npm run dev

# Production mode
npm run build
npm start
```

### Configuring with Claude Desktop

Add this to your Claude Desktop configuration (`~/.config/claude/claude_desktop_config.json` on Linux, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "roc-syntax": {
      "command": "node",
      "args": ["/path/to/roc-platform-template-zig/mcp/dist/index.js"]
    }
  }
}
```

Or for development:

```json
{
  "mcpServers": {
    "roc-syntax": {
      "command": "npx",
      "args": ["tsx", "/path/to/roc-platform-template-zig/mcp/src/index.ts"]
    }
  }
}
```

## Available Tools

### `get_roc_syntax`

Returns the complete Roc syntax reference file demonstrating all Roc language syntax.

**Input:** None

**Output:** The full `all_roc_syntax.roc` file content

### `search_roc_syntax`

Search for specific Roc syntax by topic.

**Input:**
- `query` (string): Topic or keyword to search for

**Output:** Relevant code examples for the topic

### `list_roc_topics`

List all available syntax topics.

**Input:** None

**Output:** List of topics with descriptions

## Available Topics

| Topic | Description |
|-------|-------------|
| `operators` | Arithmetic, comparison, and boolean operators |
| `pattern_matching` | Pattern matching with match expressions |
| `list_patterns` | List destructuring and pattern matching |
| `tag_unions` | Tag unions (sum types) and Result/Try types |
| `strings` | String literals, multiline strings, and interpolation |
| `effects` | Effectful functions (marked with !) |
| `loops` | For loops and mutable variables |
| `conditionals` | If/else expressions |
| `tuples` | Tuple types and destructuring |
| `records` | Record types, access, and updates |
| `types` | Type annotations and constraints |
| `numbers` | Numeric types and literals |
| `opaque` | Opaque types for type-safe wrappers |
| `nominal` | Nominal types with custom methods |
| `functions` | Function definitions and early returns |
| `imports` | Module imports and aliases |
| `testing` | Testing with expect and test blocks |

## Example Queries

Once connected, an AI agent can ask things like:

- "Show me the Roc syntax reference" → uses `get_roc_syntax`
- "How do I do pattern matching in Roc?" → uses `search_roc_syntax` with query "pattern_matching"
- "What Roc syntax topics are available?" → uses `list_roc_topics`
- "Show me Roc operators" → uses `search_roc_syntax` with query "operators"

## Development

```bash
# Build TypeScript
npm run build

# Run in dev mode with tsx
npm run dev
```

## License

MIT