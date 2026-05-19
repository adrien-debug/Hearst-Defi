"use client";

import { SegmentError } from "@/components/error/segment-error";

export default function InvestorMemoError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      scope="Investor Memo · Erreur"
      homeHref="/investor-memo"
      homeLabel="Recharger l'Investor Memo"
    />
  );
}
