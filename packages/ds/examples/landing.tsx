/**
 * Premium Landing — example app for @ds/core
 *
 * Theme: `enterprise` (conservative, high-contrast, blue accent) — picked over `light`
 * because the landing targets buyers in finance/B2B ops who expect the Stripe/Linear/
 * Vercel idiom: near-neutral hull, restrained accent, very tight type. Enterprise theme
 * meets WCAG AAA on body copy out of the box, while keeping a hero gradient that reads
 * as premium rather than flashy.
 *
 * Requires DS components from agents E (Button, Input), F (Card, Tabs), G (Avatar,
 * Badge, Accordion is in F per CONTRACT.md but we re-use Tabs/Accordion-like patterns
 * via accordion primitive from F's allocation). Run `pnpm typecheck` after all agents
 * are done.
 */

"use client";

import * as React from "react";

import { Accordion } from "@ds/core/primitives/accordion";
import { Avatar } from "@ds/core/primitives/avatar";
import { Badge } from "@ds/core/primitives/badge";
import { Button } from "@ds/core/primitives/button";
import { Card } from "@ds/core/primitives/card";
import { Topbar } from "@ds/core/primitives/topbar";

/* ─────────────────────────────────────────────────────────────────────────────
 * Mock content
 * ─────────────────────────────────────────────────────────────────────────── */

const NAV = [
  { label: "Product",   href: "#product" },
  { label: "Pricing",   href: "#pricing" },
  { label: "Customers", href: "#customers" },
  { label: "Docs",      href: "#docs" },
];

const LOGOS = ["Northwind", "Helix Studio", "Ridgehouse", "Kontur", "Longshore", "Arcadia"];

type Feature = {
  icon: "shield" | "zap" | "globe" | "lock" | "git-branch" | "activity";
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: "shield",
    title: "Audited from day one",
    body: "SOC 2 Type II, ISO 27001, and a fresh Spearbit review every release. Every change ships with the report attached.",
  },
  {
    icon: "zap",
    title: "Settles in seconds",
    body: "P95 < 480 ms from request to confirmation. Same-day USDC payouts to every chain we support.",
  },
  {
    icon: "globe",
    title: "Coverage across 38 markets",
    body: "Local payment methods, local entities, local support. One API, no per-country rewrite.",
  },
  {
    icon: "lock",
    title: "Custody without lock-in",
    body: "Bring Fireblocks, Anchorage, or self-host. Keys never leave your perimeter.",
  },
  {
    icon: "git-branch",
    title: "Versioned by contract",
    body: "Every endpoint pins a semver. Breaking changes ship behind a 6-month deprecation window — predictable, always.",
  },
  {
    icon: "activity",
    title: "Observable end-to-end",
    body: "OpenTelemetry-native. Drop our exporter next to your own and your traces stitch automatically.",
  },
];

type Tier = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  description: string;
  ctaLabel: string;
  ctaVariant: "primary" | "secondary";
  highlighted?: boolean;
  features: string[];
};

const TIERS: Tier[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "Ship your first integration this afternoon.",
    ctaLabel: "Start for free",
    ctaVariant: "secondary",
    features: [
      "Up to $25k monthly volume",
      "Sandbox + 1 production environment",
      "Community support",
      "Standard webhooks",
      "Two-day batch payouts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$490",
    cadence: "/month",
    description: "For teams scaling past first revenue.",
    ctaLabel: "Get started",
    ctaVariant: "primary",
    highlighted: true,
    features: [
      "Unlimited monthly volume",
      "5 production environments",
      "Same-day payouts to USDC",
      "Signed webhooks + replay",
      "Priority response · 4 h SLA",
      "Quarterly architecture review",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "Bring your own custody, your own residency, your own paper.",
    ctaLabel: "Talk to sales",
    ctaVariant: "secondary",
    features: [
      "Dedicated cluster · single tenancy",
      "BYO custody (Fireblocks / Anchorage)",
      "EU / US / SG data residency",
      "Named account team · 1 h SLA",
      "Custom legal terms · DPA · BAA",
      "On-prem deployment optional",
    ],
  },
];

const FAQ = [
  {
    q: "How long does onboarding take?",
    a: "Most teams ship a sandbox integration the same day and reach production in under two weeks. Enterprise procurement averages 21 business days, including legal and security review.",
  },
  {
    q: "Do you custody assets?",
    a: "Not by default. We integrate with Fireblocks and Anchorage, and we support self-custody via your own MPC vault. Keys never leave your perimeter unless you explicitly opt in to managed custody.",
  },
  {
    q: "What happens if I exceed my plan?",
    a: "We never block production traffic. Excess usage rolls onto a metered overage line on the next invoice, billed at the rate quoted in your order form.",
  },
  {
    q: "Can I export my data?",
    a: "Yes — every ledger entry, webhook, and report is exportable as Parquet or NDJSON via a signed S3 link. No proprietary formats, no lock-in.",
  },
  {
    q: "Is the platform open source?",
    a: "Our SDKs and CLI are Apache 2.0. The settlement engine is source-available under BSL with a four-year change date, after which it converts to Apache 2.0 automatically.",
  },
];

const FOOTER_COLS = [
  {
    title: "Product",
    links: ["Overview", "Pricing", "Changelog", "Status", "Roadmap"],
  },
  {
    title: "Developers",
    links: ["Docs", "API reference", "SDKs", "Webhooks", "Integrations"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Customers", "Press", "Contact"],
  },
  {
    title: "Legal",
    links: ["Terms", "Privacy", "DPA", "Subprocessors", "Security"],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * Example app
 * ─────────────────────────────────────────────────────────────────────────── */

export default function PremiumLandingExample() {
  return (
    <div
      data-ds-theme="enterprise"
      className="
        ds-theme-enterprise
        min-h-screen w-full
        bg-[color:var(--ds-color-surface-base)]
        text-[color:var(--ds-color-text-primary)]
        font-[family-name:var(--ds-font-family-sans)]
        antialiased
      "
    >
      {/* ── Sticky topbar ────────────────────────────────────────────────── */}
      <Topbar
        sticky
        className="
          z-[var(--ds-z-sticky)]
          border-b border-[color:var(--ds-color-border-subtle)]
          bg-[color:var(--ds-color-surface-base)]/[var(--ds-opacity-80)]
          backdrop-blur-[var(--ds-blur-md)]
        "
      >
        <Topbar.Leading>
          <a
            href="#top"
            className="flex items-center gap-[var(--ds-spacing-2)] rounded-[var(--ds-radius-sm)] focus-visible:outline focus-visible:outline-[length:var(--ds-focus-ring-width)] focus-visible:outline-[color:var(--ds-color-focus-ring)]"
          >
            <div
              aria-hidden
              className="
                h-[var(--ds-spacing-7)] w-[var(--ds-spacing-7)]
                rounded-[var(--ds-radius-md)]
                bg-[color:var(--ds-color-accent-500)]
              "
            />
            <span className="text-[length:var(--ds-font-size-heading-sm)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
              Lattice
            </span>
          </a>
        </Topbar.Leading>

        <Topbar.Center>
          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-[var(--ds-spacing-6)]">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    className="
                      text-[length:var(--ds-font-size-body-sm)]
                      text-[color:var(--ds-color-text-secondary)]
                      hover:text-[color:var(--ds-color-text-primary)]
                      transition-[color] duration-[var(--ds-motion-duration-base)] ease-[var(--ds-motion-easing-standard)]
                    "
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Topbar.Center>

        <Topbar.Trailing>
          <Button variant="ghost" size="sm" href="#signin">Sign in</Button>
          <Button variant="primary" size="sm" href="#start">Get started</Button>
        </Topbar.Trailing>
      </Topbar>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section
          id="top"
          className="
            relative isolate overflow-hidden
            px-[var(--ds-spacing-6)] pt-[var(--ds-spacing-16)] pb-[var(--ds-spacing-14)]
            sm:pt-[var(--ds-spacing-20)] sm:pb-[var(--ds-spacing-16)]
          "
        >
          {/* Background gradient — token-driven, no hex */}
          <div
            aria-hidden
            className="
              pointer-events-none absolute inset-0 -z-10
              bg-[image:var(--ds-gradient-hero-radial)]
              opacity-[var(--ds-opacity-60)]
            "
          />
          <div className="mx-auto max-w-[var(--ds-container-xl)] text-center ds-animate-fade-in">
            <Badge tone="accent" variant="soft" size="md" className="mb-[var(--ds-spacing-5)]">
              Now in general availability · v4.0
            </Badge>
            <h1
              className="
                mx-auto max-w-[var(--ds-content-max-width)]
                text-[length:var(--ds-font-size-display-2xl)]
                font-[weight:var(--ds-font-weight-semibold)]
                tracking-[var(--ds-letter-spacing-tighter)]
                leading-[var(--ds-line-height-display)]
              "
            >
              Payments infrastructure for teams that don't have time to babysit it.
            </h1>
            <p
              className="
                mx-auto mt-[var(--ds-spacing-6)]
                max-w-[var(--ds-content-readable-width)]
                text-[length:var(--ds-font-size-body-lg)]
                leading-[var(--ds-line-height-relaxed)]
                text-[color:var(--ds-color-text-secondary)]
              "
            >
              One API for cards, ACH, SEPA, and stablecoin settlement. Audited, observable,
              and versioned so the integration you ship in May still works in May next year.
            </p>
            <div className="mt-[var(--ds-spacing-8)] flex flex-col items-center justify-center gap-[var(--ds-spacing-3)] sm:flex-row">
              <Button variant="primary" size="lg" href="#start">Start building</Button>
              <Button variant="ghost" size="lg" href="#book-demo" trailingIcon="arrow-right">
                Book a demo
              </Button>
            </div>
            <p className="mt-[var(--ds-spacing-4)] text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-tertiary)]">
              No credit card · live in sandbox under 10 minutes
            </p>
          </div>
        </section>

        {/* ── Logos row ─────────────────────────────────────────────────── */}
        <section
          aria-label="Trusted by"
          className="
            border-y border-[color:var(--ds-color-border-subtle)]
            bg-[color:var(--ds-color-surface-subtle)]
            px-[var(--ds-spacing-6)] py-[var(--ds-spacing-7)]
          "
        >
          <div className="mx-auto max-w-[var(--ds-container-xl)]">
            <p className="mb-[var(--ds-spacing-4)] text-center text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-tertiary)]">
              Powering payments at
            </p>
            <ul className="
              grid grid-cols-2 items-center justify-items-center gap-[var(--ds-spacing-6)]
              sm:grid-cols-3 lg:grid-cols-6
            ">
              {LOGOS.map((name) => (
                <li
                  key={name}
                  aria-label={name}
                  className="
                    text-[length:var(--ds-font-size-heading-sm)]
                    font-[weight:var(--ds-font-weight-medium)]
                    tracking-[var(--ds-letter-spacing-tight)]
                    text-[color:var(--ds-color-text-tertiary)]
                    opacity-[var(--ds-opacity-80)]
                  "
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Features grid ────────────────────────────────────────────── */}
        <section
          id="product"
          className="px-[var(--ds-spacing-6)] py-[var(--ds-spacing-16)]"
        >
          <div className="mx-auto max-w-[var(--ds-container-xl)]">
            <header className="mx-auto mb-[var(--ds-spacing-10)] max-w-[var(--ds-content-readable-width)] text-center">
              <h2 className="text-[length:var(--ds-font-size-display-md)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
                Built for teams who measure their own latency.
              </h2>
              <p className="mt-[var(--ds-spacing-4)] text-[length:var(--ds-font-size-body-md)] text-[color:var(--ds-color-text-secondary)]">
                Six commitments we make on every release — and the dashboards to prove them.
              </p>
            </header>

            <ul className="
              grid gap-[var(--ds-spacing-4)]
              grid-cols-1 md:grid-cols-2 lg:grid-cols-3
            ">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <Card padding="lg" interactive className="h-full">
                    <Card.Body className="flex flex-col gap-[var(--ds-spacing-3)]">
                      <div
                        aria-hidden
                        className="
                          inline-flex h-[var(--ds-spacing-10)] w-[var(--ds-spacing-10)]
                          items-center justify-center
                          rounded-[var(--ds-radius-lg)]
                          bg-[color:var(--ds-color-accent-soft)]
                          text-[color:var(--ds-color-accent-500)]
                        "
                      >
                        <Card.Icon name={f.icon} />
                      </div>
                      <h3 className="text-[length:var(--ds-font-size-heading-sm)] font-[weight:var(--ds-font-weight-semibold)]">
                        {f.title}
                      </h3>
                      <p className="text-[length:var(--ds-font-size-body-md)] leading-[var(--ds-line-height-relaxed)] text-[color:var(--ds-color-text-secondary)]">
                        {f.body}
                      </p>
                    </Card.Body>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <section
          id="pricing"
          className="
            border-t border-[color:var(--ds-color-border-subtle)]
            bg-[color:var(--ds-color-surface-subtle)]
            px-[var(--ds-spacing-6)] py-[var(--ds-spacing-16)]
          "
        >
          <div className="mx-auto max-w-[var(--ds-container-xl)]">
            <header className="mx-auto mb-[var(--ds-spacing-10)] max-w-[var(--ds-content-readable-width)] text-center">
              <h2 className="text-[length:var(--ds-font-size-display-md)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
                Pricing that follows your volume — not your headcount.
              </h2>
              <p className="mt-[var(--ds-spacing-4)] text-[length:var(--ds-font-size-body-md)] text-[color:var(--ds-color-text-secondary)]">
                Every plan includes audited contracts, SAML SSO, and unlimited environments.
              </p>
            </header>

            <ul className="
              grid gap-[var(--ds-spacing-4)]
              grid-cols-1 lg:grid-cols-3
              items-stretch
            ">
              {TIERS.map((t) => (
                <li key={t.id}>
                  <Card
                    padding="lg"
                    elevated={t.highlighted}
                    className={[
                      "flex h-full flex-col",
                      t.highlighted
                        ? "ring-[length:var(--ds-border-width-2)] ring-[color:var(--ds-color-accent-500)]"
                        : "",
                    ].join(" ")}
                  >
                    <Card.Header className="flex flex-col gap-[var(--ds-spacing-2)]">
                      <div className="flex items-center justify-between gap-[var(--ds-spacing-3)]">
                        <Card.Title>{t.name}</Card.Title>
                        {t.highlighted ? (
                          <Badge tone="accent" variant="solid" size="sm">Most chosen</Badge>
                        ) : null}
                      </div>
                      <Card.Description>{t.description}</Card.Description>
                    </Card.Header>
                    <Card.Body className="flex flex-1 flex-col gap-[var(--ds-spacing-5)]">
                      <div className="flex items-baseline gap-[var(--ds-spacing-2)]">
                        <span className="text-[length:var(--ds-font-size-display-lg)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
                          {t.price}
                        </span>
                        {t.cadence ? (
                          <span className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-tertiary)]">
                            {t.cadence}
                          </span>
                        ) : null}
                      </div>
                      <ul className="flex flex-col gap-[var(--ds-spacing-3)]">
                        {t.features.map((feat) => (
                          <li
                            key={feat}
                            className="flex items-start gap-[var(--ds-spacing-3)] text-[length:var(--ds-font-size-body-sm)]"
                          >
                            <Card.Icon
                              name="check"
                              className="mt-[var(--ds-spacing-1)] text-[color:var(--ds-color-accent-500)]"
                            />
                            <span className="text-[color:var(--ds-color-text-secondary)]">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </Card.Body>
                    <Card.Footer>
                      <Button variant={t.ctaVariant} size="md" className="w-full">
                        {t.ctaLabel}
                      </Button>
                    </Card.Footer>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Testimonial ─────────────────────────────────────────────── */}
        <section
          id="customers"
          className="px-[var(--ds-spacing-6)] py-[var(--ds-spacing-16)]"
        >
          <div className="mx-auto max-w-[var(--ds-container-lg)]">
            <Card padding="xl" elevated className="text-center">
              <Card.Body className="flex flex-col items-center gap-[var(--ds-spacing-6)]">
                <Avatar
                  size="lg"
                  fallback="MF"
                  src="/avatars/mateo.jpg"
                  alt="Mateo Ferrari"
                />
                <blockquote
                  className="
                    max-w-[var(--ds-content-readable-width)]
                    text-[length:var(--ds-font-size-heading-lg)]
                    font-[weight:var(--ds-font-weight-medium)]
                    leading-[var(--ds-line-height-snug)]
                    text-[color:var(--ds-color-text-primary)]
                  "
                >
                  &ldquo;We rebuilt our settlement layer on Lattice in nine working days. The week
                  after we shipped, every engineer asked the same thing : why didn't we do this two
                  years ago.&rdquo;
                </blockquote>
                <footer className="flex flex-col items-center gap-[var(--ds-spacing-1)]">
                  <span className="text-[length:var(--ds-font-size-body-md)] font-[weight:var(--ds-font-weight-semibold)]">
                    Mateo Ferrari
                  </span>
                  <span className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-tertiary)]">
                    Head of Platform · Helix Studio
                  </span>
                </footer>
              </Card.Body>
            </Card>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section
          id="faq"
          className="
            border-t border-[color:var(--ds-color-border-subtle)]
            px-[var(--ds-spacing-6)] py-[var(--ds-spacing-16)]
          "
        >
          <div className="mx-auto max-w-[var(--ds-container-md)]">
            <header className="mb-[var(--ds-spacing-8)] text-center">
              <h2 className="text-[length:var(--ds-font-size-display-sm)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
                Frequently asked
              </h2>
              <p className="mt-[var(--ds-spacing-3)] text-[length:var(--ds-font-size-body-md)] text-[color:var(--ds-color-text-secondary)]">
                Five questions our customers ask before they sign.
              </p>
            </header>

            <Accordion type="single" collapsible defaultValue="q0">
              {FAQ.map((item, i) => (
                <Accordion.Item key={item.q} value={`q${i}`}>
                  <Accordion.Trigger>{item.q}</Accordion.Trigger>
                  <Accordion.Content>
                    <p className="text-[length:var(--ds-font-size-body-md)] leading-[var(--ds-line-height-relaxed)] text-[color:var(--ds-color-text-secondary)]">
                      {item.a}
                    </p>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── Closing CTA ─────────────────────────────────────────────── */}
        <section
          className="
            border-t border-[color:var(--ds-color-border-subtle)]
            bg-[color:var(--ds-color-surface-elevated)]
            px-[var(--ds-spacing-6)] py-[var(--ds-spacing-14)]
            text-center
          "
        >
          <div className="mx-auto max-w-[var(--ds-container-md)]">
            <h2 className="text-[length:var(--ds-font-size-display-sm)] font-[weight:var(--ds-font-weight-semibold)] tracking-[var(--ds-letter-spacing-tight)]">
              Build the integration you'd actually want to inherit.
            </h2>
            <p className="mt-[var(--ds-spacing-4)] text-[length:var(--ds-font-size-body-md)] text-[color:var(--ds-color-text-secondary)]">
              Sandbox in 10 minutes. Production in two weeks. Audited every release.
            </p>
            <div className="mt-[var(--ds-spacing-7)] flex flex-col items-center justify-center gap-[var(--ds-spacing-3)] sm:flex-row">
              <Button variant="primary" size="lg" href="#start">Start building</Button>
              <Button variant="secondary" size="lg" href="#contact">Contact sales</Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className="
          border-t border-[color:var(--ds-color-border-subtle)]
          bg-[color:var(--ds-color-surface-base)]
          px-[var(--ds-spacing-6)] py-[var(--ds-spacing-12)]
        "
      >
        <div className="mx-auto max-w-[var(--ds-container-xl)]">
          <div className="
            grid gap-[var(--ds-spacing-8)]
            grid-cols-2 lg:grid-cols-4
          ">
            {FOOTER_COLS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="mb-[var(--ds-spacing-4)] text-[length:var(--ds-font-size-body-sm)] font-[weight:var(--ds-font-weight-semibold)] uppercase tracking-[var(--ds-letter-spacing-wide)] text-[color:var(--ds-color-text-tertiary)]">
                  {col.title}
                </h3>
                <ul className="flex flex-col gap-[var(--ds-spacing-2)]">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a
                        href={`#${l.toLowerCase().replace(/\s+/g, "-")}`}
                        className="
                          text-[length:var(--ds-font-size-body-sm)]
                          text-[color:var(--ds-color-text-secondary)]
                          hover:text-[color:var(--ds-color-text-primary)]
                          transition-[color] duration-[var(--ds-motion-duration-base)] ease-[var(--ds-motion-easing-standard)]
                        "
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="
            mt-[var(--ds-spacing-10)] flex flex-col items-start justify-between gap-[var(--ds-spacing-4)]
            border-t border-[color:var(--ds-color-border-subtle)]
            pt-[var(--ds-spacing-6)]
            sm:flex-row sm:items-center
          ">
            <div className="flex items-center gap-[var(--ds-spacing-2)]">
              <div
                aria-hidden
                className="
                  h-[var(--ds-spacing-6)] w-[var(--ds-spacing-6)]
                  rounded-[var(--ds-radius-sm)]
                  bg-[color:var(--ds-color-accent-500)]
                "
              />
              <span className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-tertiary)]">
                © 2026 Lattice Labs, Inc. · All rights reserved.
              </span>
            </div>
            <p className="text-[length:var(--ds-font-size-body-sm)] text-[color:var(--ds-color-text-tertiary)]">
              SOC 2 Type II · ISO 27001 · PCI DSS L1
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
