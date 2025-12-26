import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod";
import * as fs from "fs";
import * as path from "path";

// Read the Roc syntax reference file
const syntaxFilePath = path.join(
  import.meta.dirname,
  "../all_roc_syntax.roc"
);

function loadSyntaxReference(): string {
  try {
    return fs.readFileSync(syntaxFilePath, "utf-8");
  } catch (error) {
    console.error(`Failed to load syntax reference: ${error}`);
    return "Error: Could not load Roc syntax reference file.";
  }
}

// Parse the syntax file into sections for targeted lookups
interface SyntaxSection {
  name: string;
  content: string;
  startLine: number;
  endLine: number;
}

function parseSyntaxSections(content: string): SyntaxSection[] {
  const lines = content.split("\n");
  const sections: SyntaxSection[] = [];

  // Define section markers based on function/definition names
  const sectionPatterns = [
    { name: "number_operators", pattern: /^number_operators\s*:/ },
    { name: "boolean_operators", pattern: /^boolean_operators\s*:/ },
    { name: "simple_match", pattern: /^simple_match\s*:/ },
    { name: "match_list_patterns", pattern: /^match_list_patterns\s*:/ },
    { name: "match_tag_union_advanced", pattern: /^match_tag_union_advanced\s*:/ },
    { name: "multiline_str", pattern: /^multiline_str\s*:/ },
    { name: "effect_demo", pattern: /^effect_demo!\s*:/ },
    { name: "for_loop", pattern: /^for_loop\s*=/ },
    { name: "dbg_keyword", pattern: /^dbg_keyword\s*=/ },
    { name: "if_demo", pattern: /^if_demo\s*:/ },
    { name: "tuple_demo", pattern: /^tuple_demo\s*=/ },
    { name: "type_var", pattern: /^type_var\s*:/ },
    { name: "destructuring", pattern: /^destructuring\s*=/ },
    { name: "record_update_2", pattern: /^record_update_2\s*:/ },
    { name: "number_literals", pattern: /^number_literals\s*=/ },
    { name: "opaque_types", pattern: /^Username\s*::/ },
    { name: "nominal_types", pattern: /^Animal\s*:=/ },
    { name: "early_return", pattern: /^early_return\s*=/ },
    { name: "where_clause", pattern: /^stringify\s*:/ },
    { name: "main", pattern: /^main!\s*=/ },
    { name: "imports", pattern: /^import\s+/ },
    { name: "app_header", pattern: /^app\s*\[/ },
  ];

  let currentSection: SyntaxSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { name, pattern } of sectionPatterns) {
      if (pattern.test(line)) {
        if (currentSection) {
          currentSection.endLine = i - 1;
          sections.push(currentSection);
        }
        currentSection = {
          name,
          content: line,
          startLine: i + 1,
          endLine: i + 1,
        };
        break;
      }
    }

    if (currentSection && !sectionPatterns.some((p) => p.pattern.test(line))) {
      currentSection.content += "\n" + line;
      currentSection.endLine = i + 1;
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

// Topics with descriptions for easy lookup
const TOPICS: Record<string, { keywords: string[]; description: string }> = {
  operators: {
    keywords: ["operator", "operators", "+", "-", "*", "/", "==", "!=", "<", ">", "<=", ">=", "and", "or", "not"],
    description: "Arithmetic, comparison, and boolean operators",
  },
  pattern_matching: {
    keywords: ["match", "pattern", "case", "switch"],
    description: "Pattern matching with match expressions",
  },
  list_patterns: {
    keywords: ["list", "array", "spread", ".."],
    description: "List destructuring and pattern matching",
  },
  tag_unions: {
    keywords: ["tag", "union", "variant", "enum", "Ok", "Err", "Try"],
    description: "Tag unions (sum types) and Result/Try types",
  },
  strings: {
    keywords: ["string", "str", "multiline", "interpolation", "unicode"],
    description: "String literals, multiline strings, and interpolation",
  },
  effects: {
    keywords: ["effect", "effectful", "!", "io", "side effect"],
    description: "Effectful functions (marked with !)",
  },
  loops: {
    keywords: ["for", "loop", "iterate", "var", "$"],
    description: "For loops and mutable variables",
  },
  conditionals: {
    keywords: ["if", "else", "conditional", "branch"],
    description: "If/else expressions",
  },
  tuples: {
    keywords: ["tuple", "pair", "triplet"],
    description: "Tuple types and destructuring",
  },
  records: {
    keywords: ["record", "struct", "object", "field", "update"],
    description: "Record types, access, and updates",
  },
  types: {
    keywords: ["type", "annotation", "signature", "where", "constraint"],
    description: "Type annotations and constraints",
  },
  numbers: {
    keywords: ["number", "int", "float", "decimal", "u8", "i64", "f64", "hex", "binary"],
    description: "Numeric types and literals",
  },
  opaque: {
    keywords: ["opaque", "::", "newtype", "wrapper"],
    description: "Opaque types for type-safe wrappers",
  },
  nominal: {
    keywords: ["nominal", ":=", "custom", "method", "is_eq"],
    description: "Nominal types with custom methods",
  },
  functions: {
    keywords: ["function", "lambda", "arrow", "=>", "->", "return"],
    description: "Function definitions and early returns",
  },
  imports: {
    keywords: ["import", "module", "as", "alias"],
    description: "Module imports and aliases",
  },
  testing: {
    keywords: ["test", "expect", "assert"],
    description: "Testing with expect and test blocks",
  },
};

// Create the MCP server
const server = new McpServer({
  name: "roc-syntax",
  version: "1.0.0",
});

// Register tool: get full syntax reference
server.registerTool(
  "get_roc_syntax",
  {
    title: "Get Roc Syntax Reference",
    description:
      "Returns the complete Roc syntax reference file demonstrating all Roc language syntax including operators, pattern matching, effects, types, and more.",
    inputSchema: {},
    outputSchema: {
      syntax: z.string(),
    },
  },
  async () => {
    const syntax = loadSyntaxReference();
    return {
      content: [{ type: "text", text: syntax }],
      structuredContent: { syntax },
    };
  }
);

// Register tool: search syntax by topic
server.registerTool(
  "search_roc_syntax",
  {
    title: "Search Roc Syntax by Topic",
    description: `Search for specific Roc syntax by topic. Available topics: ${Object.keys(TOPICS).join(", ")}. You can also search by keywords.`,
    inputSchema: {
      query: z.string().describe("Topic or keyword to search for (e.g., 'pattern_matching', 'operators', 'effects')"),
    },
    outputSchema: {
      topic: z.string(),
      description: z.string(),
      examples: z.string(),
    },
  },
  async ({ query }) => {
    const fullContent = loadSyntaxReference();
    const sections = parseSyntaxSections(fullContent);
    const queryLower = query.toLowerCase();

    // Find matching topic
    let matchedTopic: string | null = null;
    let matchedDescription = "";

    for (const [topic, { keywords, description }] of Object.entries(TOPICS)) {
      if (topic === queryLower || keywords.some((k) => queryLower.includes(k) || k.includes(queryLower))) {
        matchedTopic = topic;
        matchedDescription = description;
        break;
      }
    }

    if (!matchedTopic) {
      // Return general help if no match
      const topicList = Object.entries(TOPICS)
        .map(([name, { description }]) => `- ${name}: ${description}`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `No exact match for "${query}". Available topics:\n\n${topicList}`,
          },
        ],
        structuredContent: {
          topic: "help",
          description: "Available topics",
          examples: topicList,
        },
      };
    }

    // Find relevant sections based on topic
    const relevantSections: string[] = [];
    const lines = fullContent.split("\n");

    switch (matchedTopic) {
      case "operators":
        relevantSections.push(
          sections.find((s) => s.name === "number_operators")?.content || "",
          sections.find((s) => s.name === "boolean_operators")?.content || ""
        );
        break;
      case "pattern_matching":
        relevantSections.push(sections.find((s) => s.name === "simple_match")?.content || "");
        break;
      case "list_patterns":
        relevantSections.push(sections.find((s) => s.name === "match_list_patterns")?.content || "");
        break;
      case "tag_unions":
        relevantSections.push(sections.find((s) => s.name === "match_tag_union_advanced")?.content || "");
        break;
      case "strings":
        relevantSections.push(sections.find((s) => s.name === "multiline_str")?.content || "");
        // Add unicode escape example from main
        relevantSections.push('Unicode escape: "\\u(00A0)"');
        break;
      case "effects":
        relevantSections.push(sections.find((s) => s.name === "effect_demo")?.content || "");
        break;
      case "loops":
        relevantSections.push(sections.find((s) => s.name === "for_loop")?.content || "");
        break;
      case "conditionals":
        relevantSections.push(sections.find((s) => s.name === "if_demo")?.content || "");
        break;
      case "tuples":
        relevantSections.push(sections.find((s) => s.name === "tuple_demo")?.content || "");
        break;
      case "records":
        relevantSections.push(
          sections.find((s) => s.name === "destructuring")?.content || "",
          sections.find((s) => s.name === "record_update_2")?.content || ""
        );
        break;
      case "types":
        relevantSections.push(
          sections.find((s) => s.name === "type_var")?.content || "",
          sections.find((s) => s.name === "where_clause")?.content || ""
        );
        break;
      case "numbers":
        relevantSections.push(sections.find((s) => s.name === "number_literals")?.content || "");
        break;
      case "opaque":
        relevantSections.push(sections.find((s) => s.name === "opaque_types")?.content || "");
        break;
      case "nominal":
        relevantSections.push(sections.find((s) => s.name === "nominal_types")?.content || "");
        break;
      case "functions":
        relevantSections.push(sections.find((s) => s.name === "early_return")?.content || "");
        break;
      case "imports":
        // Extract import lines from the top of the file
        const importLines = lines.filter((l) => l.startsWith("import "));
        relevantSections.push(importLines.join("\n"));
        break;
      case "testing":
        // Extract expect examples
        const expectLines = lines.filter((l) => l.includes("expect "));
        relevantSections.push(expectLines.join("\n"));
        break;
    }

    const examples = relevantSections.filter(Boolean).join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text",
          text: `## ${matchedTopic}\n\n${matchedDescription}\n\n### Examples:\n\n\`\`\`roc\n${examples}\n\`\`\``,
        },
      ],
      structuredContent: {
        topic: matchedTopic,
        description: matchedDescription,
        examples,
      },
    };
  }
);

// Register tool: list available topics
server.registerTool(
  "list_roc_topics",
  {
    title: "List Roc Syntax Topics",
    description: "List all available Roc syntax topics that can be queried",
    inputSchema: {},
    outputSchema: {
      topics: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        })
      ),
    },
  },
  async () => {
    const topics = Object.entries(TOPICS).map(([name, { description }]) => ({
      name,
      description,
    }));

    const formatted = topics.map((t) => `- **${t.name}**: ${t.description}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `# Available Roc Syntax Topics\n\n${formatted}`,
        },
      ],
      structuredContent: { topics },
    };
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Roc Syntax MCP Server running on stdio");
}

main().catch(console.error);
