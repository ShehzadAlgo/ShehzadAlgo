import type { StrategySpec } from "./spec.js";
import type { StrategyTemplate } from "./templates.js";
import { templates } from "./templates.js";

export interface SearchResult {
  template: StrategyTemplate;
  spec: StrategySpec;
  score: number;
}

export function searchTemplates(prompt: string, limit?: number): SearchResult[] {
  const useLimit = typeof limit === "number" ? limit : 3;
  const scored = templates.map((t) => ({
    template: t,
    spec: materializeTemplate(t),
    score: scorePrompt(prompt, t),
  }));
  return scored.toSorted((a, b) => b.score - a.score).slice(0, useLimit);
}

export function materializeTemplate(
  template: StrategyTemplate,
  _params: Record<string, number> = {},
): StrategySpec {
  return {
    ...template.baseSpec,
    rules: { entries: [], exits: [] },
    risk: {
      positionSizing: "percent-equity",
      sizingValue: 1,
    },
  };
}

function scorePrompt(prompt: string, template: StrategyTemplate): number {
  const p = prompt.toLowerCase();
  let s = 0;
  if (p.includes(template.name.toLowerCase())) {s += 1;}
  template.assetClasses.forEach((cls) => {
    if (p.includes(cls)) {s += 0.5;}
  });
  return s;
}
