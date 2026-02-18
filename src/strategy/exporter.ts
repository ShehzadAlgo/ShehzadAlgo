import type { StrategySpec } from "./spec.js";

export interface ExportResult {
  code: string;
  language: "pine" | "internal-dsl";
  warnings?: string[];
}

export function exportToPine(spec: StrategySpec): ExportResult {
  const code = `// auto-generated stub\\n// strategy: ${spec.name}\\n// timeframe: ${spec.timeframe}\\n`;
  return { code, language: "pine", warnings: ["stub export"] };
}

export function exportToInternalDsl(spec: StrategySpec): ExportResult {
  const code = `# strategy: ${spec.name}\\n# timeframe: ${spec.timeframe}\\n`;
  return { code, language: "internal-dsl", warnings: ["stub export"] };
}
