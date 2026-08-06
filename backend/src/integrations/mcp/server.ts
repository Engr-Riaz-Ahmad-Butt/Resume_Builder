import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerPrompts } from "./helpers/prompts";
import { registerResources } from "./helpers/resources";
import { registerTools } from "./helpers/tools";

export const MCP_SERVER_VERSION = "0.0.0";

export function createMcpServer() {
  const server = new McpServer(
    {
      name: "reactive-resume",
      version: MCP_SERVER_VERSION,
      title: "Reactive Resume",
      websiteUrl: "https://rxresu.me",
      description:
        "Reactive Resume is a free and open-source resume builder. Use this MCP server to interact with your resume using an LLM of your choice.",
      icons: [
        {
          src: "https://rxresu.me/icon/light.svg",
          mimeType: "image/svg+xml",
          theme: "light",
        },
        {
          src: "https://rxresu.me/icon/dark.svg",
          mimeType: "image/svg+xml",
          theme: "dark",
        },
      ],
    },
    {
      instructions: [
        "You are connected to Reactive Resume over MCP.",
        "Authenticate with OAuth (recommended) or an API key (`x-api-key`).",
        "Discover resume IDs with `reactive_resume_list_resumes` (not `resources/list`).",
        "List distinct tags with `reactive_resume_list_resume_tags`.",
        "Read schema at `resume://_meta/schema`; read resume JSON via `resume://{id}` or `reactive_resume_get_resume`.",
        "Apply body edits with JSON Patch through `reactive_resume_patch_resume`.",
        "Change name, slug, tags, or public visibility with `reactive_resume_update_resume` (returns canonical share URL; anonymous access only when `isPublic` is true; passwords are managed in the web app only).",
        "Import full ResumeData JSON with `reactive_resume_import_resume`; read saved AI analysis with `reactive_resume_get_resume_analysis`.",
      ].join(" "),
    },
  );

  registerResources(server);
  registerTools(server);
  registerPrompts(server);

  return server;
}
