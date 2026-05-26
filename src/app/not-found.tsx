import { STANDALONE_STYLES, StandaloneBackLink } from "@/components/error/error-shell";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const session = await getSession();
  const target = session ? "/portfolio" : "/login";
  const label = session ? "Go to Portfolio" : "Sign in";
  return (
    <div style={STANDALONE_STYLES.container}>
      <h1 style={STANDALONE_STYLES.title}>404 — Page not found</h1>
      <p style={STANDALONE_STYLES.body}>
        This page does not exist or has been moved.
      </p>
      <StandaloneBackLink href={target} label={label} />
    </div>
  );
}
