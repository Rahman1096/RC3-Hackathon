"use client";

import { useFormStatus } from "react-dom";

type Props = { label: string; pendingLabel: string; className?: string; confirmMessage?: string; disabled?: boolean };
export function SubmitButton({ label, pendingLabel, className = "", confirmMessage, disabled = false }: Props) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} onClick={(event) => { if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault(); }} className={`${className} transition focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-60`}>{pending ? pendingLabel : label}</button>;
}
