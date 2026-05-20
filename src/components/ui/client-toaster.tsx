"use client";

import dynamic from "next/dynamic";

// next/dynamic with ssr:false excludes sonner from the SSR bundle entirely,
// preventing /_global-error prerender from pulling in sonner's useContext calls.
const Toaster = dynamic(
  () => import("./toaster").then((m) => ({ default: m.Toaster })),
  { ssr: false },
);

export function ClientToaster() {
  return <Toaster />;
}
