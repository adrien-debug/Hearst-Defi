"use client";

import { SegmentError } from "@/components/error/segment-error";

export default function InvestorMemoError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      scope="Investor Memo · Error"
      homeHref="/admin/investor-memo"
      homeLabel="Reload Investor Memo"
    />
  );
}
