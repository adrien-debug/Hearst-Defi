import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { HomeCta } from "@/components/auth/home-cta";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/animation/motion";

export default function Home() {
  return (
    <main className="min-h-dvh">
      {/* Hero */}
      <section className="flex items-center justify-center px-6 py-24 md:py-32">
        <div className="max-w-4xl text-center">
          <FadeIn delay={0}>
            <Image
              src="/logos/hearst-connect.svg"
              alt="Hearst Connect"
              width={791}
              height={268}
              className="mx-auto mb-10 h-14 w-auto md:h-16"
              priority
            />
          </FadeIn>
          
          <FadeIn delay={0.1}>
            <p className="eyebrow mb-5">Pre-launch</p>
          </FadeIn>
          
          <FadeIn delay={0.2}>
            <h1 className="h1 text-balance">
              Institutional USDC vault.
              <br />
              <span className="text-[--ct-text-body]">
                Mining-backed structured yield.
              </span>
            </h1>
          </FadeIn>
          
          <FadeIn delay={0.3}>
            <p className="body-lg mx-auto mt-8 max-w-2xl text-pretty text-[--ct-text-body]">
              Bitcoin mining cashflow, USDC base yield, and rule-based BTC tactical
              exposure in a single vault. Monthly USDC distributions. Target APY
              range 8–15%. Projection conditional on stated assumptions. Not
              guaranteed.
            </p>
          </FadeIn>
          
          <FadeIn delay={0.4}>
            <Suspense fallback={<HomeCtaFallback />}>
              <HomeCta />
            </Suspense>
          </FadeIn>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-[--ct-border-soft] bg-[--ct-surface-0] px-6 py-16">
        <StaggerContainer className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
          <StaggerItem>
            <Stat value="8–15%" label="Target APY range" />
          </StaggerItem>
          <StaggerItem>
            <Stat value="$250k" label="Minimum ticket" />
          </StaggerItem>
          <StaggerItem>
            <Stat value="60d" label="Soft lock-up" />
          </StaggerItem>
          <StaggerItem>
            <Stat value="Monthly" label="USDC distributions" />
          </StaggerItem>
        </StaggerContainer>
      </section>

      {/* Features */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <FadeIn>
            <h2 className="h2 mb-16 text-center">How it works</h2>
          </FadeIn>
          <StaggerContainer className="grid gap-8 md:grid-cols-3">
            <StaggerItem>
              <Feature
                title="Mining Cashflow"
                description="Revenue-share contracts with hosted Bitcoin mining operations. Hashprice-attested, energy-cost transparent."
              />
            </StaggerItem>
            <StaggerItem>
              <Feature
                title="Rule-Based Tactical"
                description="BTC exposure managed by deterministic triggers — accumulate on drawdowns, take profit on run-ups. No discretion."
              />
            </StaggerItem>
            <StaggerItem>
              <Feature
                title="Institutional Transparency"
                description="Every data point backed by attestations. Proof Center with on-chain and off-chain evidence."
              />
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 md:py-32">
        <FadeIn>
          <div className="mx-auto max-w-3xl rounded-3xl border border-[--ct-border-soft] bg-[--ct-surface-0] p-10 md:p-16 text-center">
            <h2 className="h2 mb-4">Ready to explore?</h2>
            <p className="body-lg text-[--ct-text-body] mb-10">
              Access the dashboard, run scenarios, and generate your first investor memo.
            </p>
            <Button variant="primary" size="lg" asChild>
              <Link href="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-[--ct-border-soft] px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-[--ct-text-muted]">
            © {new Date().getFullYear()} Hearst Connect. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/admin/roadmap" className="text-sm text-[--ct-text-muted] hover:text-[--ct-text-primary] transition-colors">
              Roadmap
            </Link>
            <Link href="/admin/feedback" className="text-sm text-[--ct-text-muted] hover:text-[--ct-text-primary] transition-colors">
              Feedback
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="stat-value">{value}</p>
      <p className="mt-2 text-sm text-[--ct-text-muted]">{label}</p>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[--ct-border-soft] bg-[--ct-surface-0] p-8">
      <h3 className="h3 mb-3">{title}</h3>
      <p className="text-[--ct-text-body] leading-relaxed">{description}</p>
    </div>
  );
}

function HomeCtaFallback() {
  return (
    <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
      <Button variant="primary" size="lg" asChild>
        <Link href="/dashboard">Open Dashboard</Link>
      </Button>
      <Button variant="secondary" size="lg" asChild>
        <Link href="/admin/roadmap">Admin</Link>
      </Button>
    </div>
  );
}
