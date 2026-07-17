import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "medwallet-mcp",
  title: "MedWallet MCP",
  version: "0.1.0",
  instructions:
    "Tools for MedWallet — a Mozambican health super-app (pharmacies, doctors, wallet). Use `echo` to verify connectivity. More tools will be added over time.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool],
});