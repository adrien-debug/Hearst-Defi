"use client";

import { Button } from "@/components/ui/button";
import { setInvestorKyc } from "@/app/admin/customers/actions";

/**
 * Admin KYC override control. Renders inline in the customers table. "Approve"
 * appears when the investor is not yet approved; "Reset" appears when they are.
 * Submits the admin-only `setInvestorKyc` server action.
 */
export function KycAction({
  investorId,
  status,
}: {
  investorId: string;
  status: "pending" | "approved" | "rejected";
}) {
  const next = status === "approved" ? "pending" : "approved";
  const label = status === "approved" ? "Reset" : "Approve";

  return (
    <form action={setInvestorKyc} className="inline">
      <input type="hidden" name="investorId" value={investorId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant="secondary" size="sm">
        {label}
      </Button>
    </form>
  );
}
