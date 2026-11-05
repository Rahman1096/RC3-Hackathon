import assert from "node:assert/strict";

const overlaps = (start: number, duration: number, otherStart: number, otherDuration: number) => otherStart < start + duration && otherStart + otherDuration > start;
assert.equal(overlaps(600, 45, 630, 30), true, "interviewer/candidate overlap must block");
assert.equal(overlaps(600, 45, 645, 30), false, "back-to-back interview is allowed");
const submitted = new Date("2026-01-01T10:00:00Z"); const shortlisted = new Date("2026-01-03T10:00:00Z");
assert.equal((shortlisted.getTime() - submitted.getTime()) / 86400000, 2, "processing-time definition");
console.log("PASS interview conflict detection and processing-time arithmetic.");
