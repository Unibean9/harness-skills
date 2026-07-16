#!/usr/bin/env node
import { reserveSpec } from "./state.mjs";
try {
  console.log(reserveSpec(process.argv[2]));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
