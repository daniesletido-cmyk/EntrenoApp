import fs from "fs";
import { extractZeppSleep } from "../src/lib/import/zepp-sleep.ts";

const buffer = fs.readFileSync("d:/Users/Dani/Downloads/zeppbridge-2026-10-19-2026-10-25.json");
const sleepRows = await extractZeppSleep(buffer);
console.log(`Extracted ${sleepRows.length} sleep rows:`);
console.table(sleepRows);
