"use client";

import { useFormStatus } from "react-dom";
import { buttonClass } from "@/lib/ui";

export function SubmitButton({
  children,
  pendingLabel,
  className = buttonClass,
}: {
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {pending && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending ? (pendingLabel ?? "Enregistrement…") : children}
    </button>
  );
}
