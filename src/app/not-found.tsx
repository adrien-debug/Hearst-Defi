import { STANDALONE_STYLES, StandaloneBackLink } from "@/components/error/error-shell";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div style={STANDALONE_STYLES.container}>
      <h1 style={STANDALONE_STYLES.title}>404 — Page not found</h1>
      <p style={STANDALONE_STYLES.body}>
        This page does not exist or has been moved.
      </p>
      <StandaloneBackLink href="/dashboard" label="Go to Dashboard" />
    </div>
  );
}
