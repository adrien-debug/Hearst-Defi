"use client";

import { SegmentError } from "@/components/error/segment-error";

export default function ProofCenterError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      scope="Proof Center · Erreur"
      homeHref="/proof-center"
      homeLabel="Recharger le Proof Center"
    />
  );
}
