"use client";

import { useEffect, useState } from "react";

export function AmbientLights() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="ct-ambient-lights" aria-hidden="true">
      <div className="ct-ambient-blob blob-1" />
      <div className="ct-ambient-blob blob-2" />
      <div className="ct-ambient-blob blob-3" />
    </div>
  );
}
