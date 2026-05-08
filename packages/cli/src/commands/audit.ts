import { defineCommand } from "citty";
import { audit, type AuditResult } from "@atelier-oss/audit";
import type { Format } from "./lint";

export interface RunAuditOptions {
  root: string;
  componentDir?: string;
  format?: Format;
}

export interface RunAuditResult {
  result: AuditResult;
  output: string;
  exitCode: 0 | 1;
}

export function runAudit(options: RunAuditOptions): RunAuditResult {
  const result = audit({
    root: options.root,
    componentDir: options.componentDir,
  });
  const format = options.format ?? "stdout";

  let output: string;
  if (format === "json") {
    const bySection: Record<string, number> = {};
    for (const [k, v] of Object.entries(result.sections))
      bySection[k] = v.length;
    output = JSON.stringify(
      {
        rootPath: result.rootPath,
        findingCount: result.findingCount,
        bySection,
        sections: result.sections,
      },
      null,
      2,
    );
  } else if (format === "md") {
    const lines: string[] = [`# Audit: ${result.rootPath}`, ""];
    lines.push(`Total findings: ${result.findingCount}`);
    lines.push("");
    for (const [section, findings] of Object.entries(result.sections)) {
      lines.push(`## ${section} (${findings.length})`);
      lines.push("");
      if (findings.length === 0) {
        lines.push("- No findings.");
      } else {
        for (const f of findings) lines.push(`- ${f.message}`);
      }
      lines.push("");
    }
    output = lines.join("\n");
  } else {
    const lines: string[] = [
      `${result.rootPath}: ${result.findingCount} finding(s)`,
    ];
    for (const [section, findings] of Object.entries(result.sections)) {
      if (findings.length > 0) lines.push(`  ${section}: ${findings.length}`);
    }
    output = lines.join("\n") + "\n";
  }

  return {
    result,
    output,
    exitCode: result.findingCount > 0 ? 1 : 0,
  };
}

export const auditCommand = defineCommand({
  meta: {
    name: "audit",
    description:
      "Six-section design audit (token usage, contrast, motion, a11y, design coverage, responsive).",
  },
  args: {
    root: {
      type: "positional",
      description: "Project root (defaults to cwd).",
      required: false,
    },
    componentDir: {
      type: "string",
      description: "Component directory relative to root.",
    },
    format: {
      type: "string",
      description: "Output format: stdout (default), json, md.",
      default: "stdout",
    },
  },
  run({ args }) {
    const { output, exitCode } = runAudit({
      root: args.root ?? process.cwd(),
      componentDir: args.componentDir,
      format: args.format as Format,
    });
    process.stdout.write(output);
    process.exit(exitCode);
  },
});
