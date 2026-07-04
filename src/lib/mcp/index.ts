import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "medwallet-mcp",
  title: "MedWallet MCP",
  version: "0.1.0",
  instructions:
    "Tools for MedWallet — a Mozambican health super-app (pharmacies, doctors, wallet). Use `echo` to verify connectivity. More tools will be added over time.",
  tools: [echoTool],
});