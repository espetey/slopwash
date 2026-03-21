// Slopwash GitHub Action
// Scaffolding — depends on the `slopwash` npm package being published first.
//
// Usage in a workflow:
//   - uses: espetey/slopwash/actions/slop-check@main
//     with:
//       paths: "docs/**/*.md"
//       threshold: 60
//       model: "gpt-4o"

import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as fs from "fs";
// import { analyze } from "slopwash";

async function run(): Promise<void> {
  try {
    const paths = core.getInput("paths") || "**/*.md";
    const model = core.getInput("model") || undefined;
    const threshold = parseInt(core.getInput("threshold") || "60", 10);
    const failOnViolations = core.getInput("fail-on-violations") !== "false";

    const globber = await glob.create(paths);
    const files = await globber.glob();

    let totalScore = 0;
    let totalViolations = 0;
    const reports: string[] = [];

    for (const file of files) {
      const text = fs.readFileSync(file, "utf-8");
      if (text.trim().length === 0) continue;

      // TODO: uncomment when slopwash npm package is available
      // const result = analyze(text, model ? { model } : undefined);
      // totalScore += result.score;
      // totalViolations += result.violations.length;
      //
      // const status = result.score >= threshold ? "PASS" : "FAIL";
      // const report = `${status} ${file}: ${result.score}/100 (${result.violations.length} violations)`;
      // reports.push(report);
      // core.info(report);
      //
      // if (result.score < threshold) {
      //   for (const v of result.violations.slice(0, 5)) {
      //     core.warning(`[${v.severity}] ${v.message}: "${v.match}"`, {
      //       file,
      //     });
      //   }
      // }

      const words = text.split(/\s+/).filter(Boolean).length;
      reports.push(`SKIP ${file}: analyzer not yet available (${words} words)`);
    }

    const avgScore =
      files.length > 0 ? Math.round(totalScore / files.length) : 100;

    core.setOutput("score", avgScore.toString());
    core.setOutput("violations", totalViolations.toString());
    core.setOutput("report", reports.join("\n"));

    if (failOnViolations && avgScore < threshold) {
      core.setFailed(
        `Slopwash score ${avgScore}/100 is below threshold ${threshold}`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
