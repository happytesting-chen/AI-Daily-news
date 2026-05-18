#!/usr/bin/env node
// Reads schedule.config.json (SGT times) and updates the crons block in vercel.json.
// Usage: node scripts/apply-schedule.js

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const scheduleFile = resolve(root, "schedule.config.json");
const vercelFile   = resolve(root, "vercel.json");

const schedule = JSON.parse(readFileSync(scheduleFile, "utf8"));
const vercel   = JSON.parse(readFileSync(vercelFile,   "utf8"));

// SGT = UTC+8, so UTC = SGT - 8 hours
function sgtToUtcCron(timeSgt) {
  const [hh, mm] = timeSgt.split(":").map(Number);
  let utcHour = hh - 8;
  let dayOffset = 0;
  if (utcHour < 0) {
    utcHour += 24;
    dayOffset = -1; // previous UTC day — cron still runs daily so no change needed
  }
  return `${mm} ${utcHour} * * *`;
}

vercel.crons = schedule.jobs.map((job) => ({
  path: job.endpoint,
  schedule: sgtToUtcCron(job.time_sgt),
}));

writeFileSync(vercelFile, JSON.stringify(vercel, null, 2) + "\n");

console.log("Updated vercel.json crons:");
schedule.jobs.forEach((job) => {
  console.log(`  ${job.time_sgt} SGT  →  ${sgtToUtcCron(job.time_sgt)} UTC  →  ${job.endpoint}`);
});
