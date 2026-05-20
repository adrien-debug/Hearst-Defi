"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { safeFrom } from "@/lib/safe-redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {
      router.replace(safeFrom(searchParams.get("from")));
    },
  });

  const autoOpenedRef = useRef(false);
  const dest = safeFrom(searchParams.get("from"));

  // Already authenticated when landing here → bypass modal, send to destination.
  useEffect(() => {
    if (!ready) return;
    if (authenticated) {
      router.replace(dest);
    }
  }, [ready, authenticated, router, dest]);

  // Auto-open the Privy modal once after hydration (single-shot via ref).
  useEffect(() => {
    if (!ready || authenticated || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    login();
  }, [ready, authenticated, login]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-24">
      <div className="w-full max-w-md text-center">
        <Image
          src="/logos/hearst-connect.svg"
          alt="Hearst Connect"
          width={791}
          height={268}
          className="mx-auto mb-10 h-12 w-auto md:h-14"
          priority
        />

        <p className="eyebrow mb-3">Secure access</p>
        <h1 className="h2 mb-4 text-balance">Sign in to Hearst Connect</h1>
        <p className="body-md mx-auto mb-10 max-w-sm text-pretty">
          Connect your wallet to access the dashboard, scenarios, and the
          investor area. Cayman SPV — accredited investors only.
        </p>

        <div className="flex flex-col items-stretch gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={() => login()}
            disabled={!ready}
            aria-busy={!ready}
          >
            {!ready ? "Loading…" : "Connect Wallet"}
          </Button>
          <Button variant="ghost" size="md" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        <p className="body-xs mt-12">
          By signing in you agree to the Cayman SPV terms. Projection is
          conditional on stated assumptions. Not guaranteed.
        </p>
      </div>
    </main>
  );
}
