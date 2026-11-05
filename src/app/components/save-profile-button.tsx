"use client";

import { SubmitButton } from "@/app/components/submit-button";

export function SaveProfileButton() {
  return <SubmitButton label="Save reviewed profile" pendingLabel="Saving profile…" className="rounded bg-cyan-400 p-3 font-bold text-slate-950 hover:bg-cyan-300" />;
}
