// `/login` — the sign-in screen (email + password, database auth).
//
// This is the canonical login route the edge proxy redirects to
// (`/login?from=<path>`). The email/password form lives in a client child
// (`LoginForm`) that reads `?from=` via `useSearchParams`, so it is wrapped in
// a Suspense boundary as Next.js requires.

import { Suspense } from "react";

import { LoginSplit } from "@/components/auth/login-split";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — Hearst Connect",
  description: "Sign in with your email and password to access your portfolio.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginSplit />
    </Suspense>
  );
}
