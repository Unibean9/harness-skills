#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { loadWorkflow, transitionWorkflow } from "./workflow-state.mjs";

const [specFlag, spec, reviewerFlag, reviewer, referenceFlag, reference, coverageFlag, coverage, orderingFlag, ordering, riskFlag, risk, qualityFlag, verifyQuality, blockersFlag, blockers] = process.argv.slice(2);
try {
  if (specFlag !== "--spec" || reviewerFlag !== "--reviewer" || referenceFlag !== "--reference" || coverageFlag !== "--coverage" || orderingFlag !== "--ordering" || riskFlag !== "--risk" || qualityFlag !== "--verify-quality" || blockersFlag !== "--blockers" || !spec || !reviewer || !reference || process.argv.length !== 20) {
    throw new Error("usage: plan-review.mjs --spec <id> --reviewer <name> --reference <ref> --coverage pass --ordering pass --risk pass --verify-quality pass --blockers 0");
  }
  if (!Number.isSafeInteger(Number(blockers)) || Number(blockers) < 0) throw new Error("blockers must be a non-negative integer");
  const current = loadWorkflow(process.cwd(), spec);
  const state = transitionWorkflow(process.cwd(), spec, "record-plan-review", {
    expectedRevision: current.revision,
    planReview: { reviewer, reference, blockersOpen: Number(blockers), dimensions: { coverage, ordering, risk, verifyQuality } },
  });
  console.log(JSON.stringify(state.planReview));
} catch (error) { console.error(error.message); process.exitCode = 1; }

if (process.argv[1] && fileURLToPath(import.meta.url) !== resolve(process.argv[1])) process.exitCode = 1;
