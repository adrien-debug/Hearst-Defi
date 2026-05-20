"use client";

import { SegmentError } from "@/components/error/segment-error";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      scope="Dashboard · Erreur"
      homeHref="/dashboard"
      homeLabel="Recharger le dashboard"
    />
  );
}
