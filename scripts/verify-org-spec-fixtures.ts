/**
 * Item B0 acceptance check (build spec section 3). The fixture spec
 * bans "guarantee" with inflect, requires "warranty", and disables
 * rule 4.1. Over the proof run fixtures:
 *   - the universal view matches plain analyze() on every field;
 *   - the org view flags "guaranteed" in the fixture sentence;
 *   - em dash findings vanish from the org view of A7 and C1 while
 *     their universal views keep them;
 *   - a piece with no "warranty" draws a required-term finding, and
 *     the warranty fixture piece does not.
 *
 * Usage: npx tsx scripts/verify-org-spec-fixtures.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { analyze } from "../lib/analyzer";
import { checkWithSpec } from "../lib/org-spec/check";
import { validateSpec } from "../lib/org-spec/types";

const PROOF_DIR = join(process.cwd(), "tests/fixtures/proof-run-1");
const SPEC_DIR = join(process.cwd(), "tests/fixtures/org-spec");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`ok   ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
  }
}

function main() {
  const spec = validateSpec(
    JSON.parse(readFileSync(join(SPEC_DIR, "spec.json"), "utf8"))
  );
  const rawManifest = JSON.parse(
    readFileSync(join(PROOF_DIR, "manifest.json"), "utf8")
  ) as { pieces: { id: string; file?: string }[] } | { id: string; file?: string }[];
  const entries = Array.isArray(rawManifest) ? rawManifest : rawManifest.pieces;

  for (const entry of entries) {
    const text = readFileSync(
      join(PROOF_DIR, entry.file ?? `${entry.id}.txt`),
      "utf8"
    );
    const plain = analyze(text);
    const checked = checkWithSpec(text, spec);
    const sameScore = checked.universal.score === plain.score;
    const sameViolations =
      checked.universal.violations.length === plain.violations.length &&
      checked.universal.violations.every((v, i) => {
        const p = plain.violations[i];
        return (
          v.rule === p.rule &&
          v.severity === p.severity &&
          v.match === p.match &&
          v.offset === p.offset
        );
      });
    check(
      `${entry.id} universal view untouched`,
      sameScore && sameViolations
    );

    if (entry.id === "a7" || entry.id === "c1") {
      const universalHas41 = checked.universal.violations.some(
        (v) => v.rule === "4.1"
      );
      const orgHas41 = checked.org.violations.some((v) => v.rule === "4.1");
      check(
        `${entry.id} rule 4.1 dropped from org view only`,
        universalHas41 && !orgHas41,
        `universal ${universalHas41}, org ${orgHas41}`
      );
    }
  }

  const guaranteed = readFileSync(join(SPEC_DIR, "guaranteed.txt"), "utf8");
  const checkedGuaranteed = checkWithSpec(guaranteed, spec);
  check(
    "org view flags inflected banned term",
    checkedGuaranteed.org.termFindings.some(
      (v) => v.rule === "org.banned" && /guaranteed/i.test(v.match)
    ),
    JSON.stringify(checkedGuaranteed.org.termFindings.map((v) => v.rule))
  );
  check(
    "piece without the required term draws org.required",
    checkedGuaranteed.org.termFindings.some((v) => v.rule === "org.required")
  );

  const warranty = readFileSync(join(SPEC_DIR, "warranty.txt"), "utf8");
  const checkedWarranty = checkWithSpec(warranty, spec);
  check(
    "piece with the required term draws no org.required",
    !checkedWarranty.org.termFindings.some((v) => v.rule === "org.required")
  );

  if (failures > 0) {
    console.error(`${failures} checks failed.`);
    process.exit(1);
  }
  console.log("All org-spec fixture checks pass.");
}

main();
