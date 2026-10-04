"use client";

import { useTransition } from "react";
import { toggleTenantFeature } from "./actions";

export function FeatureToggleCheckbox({
  tenantId,
  featureKey,
  defaultChecked,
}: {
  tenantId: string;
  featureKey: string;
  defaultChecked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={defaultChecked}
      disabled={isPending}
      aria-label={featureKey}
      onChange={(e) => {
        const enabled = e.target.checked;
        startTransition(() => {
          toggleTenantFeature(tenantId, featureKey, enabled);
        });
      }}
      className="h-4 w-4 accent-accent-500 disabled:opacity-50"
    />
  );
}
