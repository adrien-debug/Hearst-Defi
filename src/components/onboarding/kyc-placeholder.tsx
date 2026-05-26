/**
 * KycPlaceholder — stub for Persona KYC integration (Phase 2+).
 * Renders a contained placeholder panel. No external network calls.
 */
export function KycPlaceholder() {
  return (
    <div
      className="rounded-[var(--ct-radius-lg)] border border-dashed border-[var(--ct-border)] bg-[var(--ct-surface-1)] px-6 py-10 text-center"
      role="region"
      aria-label="Identity verification placeholder"
    >
      <p className="text-sm font-medium text-[var(--ct-text-muted)]">
        Identity Verification
      </p>
      <p className="mt-1 text-xs text-[var(--ct-text-dim)]">
        Persona KYC widget loads here — integration available in a later phase.
      </p>
    </div>
  );
}
