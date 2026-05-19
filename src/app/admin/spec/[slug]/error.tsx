"use client";

import { SegmentError } from "@/components/error/segment-error";

export default function SpecError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <SegmentError
      {...props}
      scope="Admin · Spec · Erreur"
      homeHref="/admin/spec"
      homeLabel="Retour à la spec"
    />
  );
}
