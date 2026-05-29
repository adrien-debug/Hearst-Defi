import { requireAdmin } from "@/lib/auth/require-admin";
import { isTotpEnabled } from "@/lib/auth/totp";
import { TotpEnrolmentClient } from "./TotpEnrolmentClient";

export const metadata = {
  title: "Security — Hearst Connect Admin",
};

export const dynamic = "force-dynamic";

/**
 * /admin/security — admin account security settings.
 *
 * Currently surfaces TOTP MFA enrolment. More security controls
 * (session management, audit log) can be added here later.
 */
export default async function AdminSecurityPage() {
  const { userId } = await requireAdmin();
  const totpEnabled = await isTotpEnabled(userId);

  return (
    <div className="space-y-8 p-6 max-w-lg">
      {/* Page header */}
      <div className="space-y-1">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--ct-text-primary)" }}
        >
          Account security
        </h1>
        <p className="body-xs ct-text-muted">
          Manage two-factor authentication and session security.
        </p>
      </div>

      {/* MFA card */}
      <section
        className="rounded-xl p-6 space-y-4"
        style={{
          background: "color-mix(in srgb, var(--ct-surface) 60%, transparent)",
          border: "1px solid var(--ct-border-soft)",
        }}
      >
        <div className="space-y-1">
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--ct-text-primary)" }}
          >
            Two-factor authentication (TOTP)
          </h2>
          <p className="body-xs ct-text-muted">
            Use an authenticator app (Google Authenticator, Authy, 1Password) to
            generate a time-based code at login. Required once enrolled.
          </p>
        </div>

        <TotpEnrolmentClient initialEnabled={totpEnabled} />
      </section>
    </div>
  );
}
