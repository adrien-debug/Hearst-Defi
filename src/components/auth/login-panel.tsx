import { LoginForm } from "@/components/auth/login-form";

/**
 * Right-hand sign-in panel: email + password (database auth).
 *
 * Privy is intentionally absent here — authentication is email/password. Wallet
 * connect (Privy) happens later, in the USDC subscription/payment flow.
 */
export function LoginPanel() {
  return (
    <div className="w-full max-w-sm">
      <header className="mb-6 text-center">
        <h2 className="ct-section-title tracking-wider">Sign in</h2>
        <p className="body-sm ct-text-muted mt-2">
          Access your vaults and portfolio
        </p>
      </header>

      <LoginForm />

      <p className="body-xs ct-text-faint mt-8 text-center text-pretty">
        Cayman SPV — accredited investors only. Projection is conditional on
        stated assumptions. Not guaranteed.
      </p>
    </div>
  );
}
