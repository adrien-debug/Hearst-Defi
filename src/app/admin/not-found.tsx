import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div
      className="glass-panel"
      style={{
        margin: "2.5rem auto",
        maxWidth: "42rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span
          className="eyebrow"
          style={{ color: "var(--ct-status-warning)" }}
        >
          Admin · 404
        </span>
        <h1 className="h2" style={{ margin: 0 }}>
          Page admin introuvable
        </h1>
      </header>

      <p
        className="body-md"
        style={{ margin: 0, color: "var(--ct-text-body)" }}
      >
        La page admin que vous cherchez n&apos;existe pas ou a été déplacée.
        Vérifiez l&apos;URL ou revenez au tableau de bord administrateur.
      </p>

      <div>
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid var(--ct-border-strong)",
            background: "var(--ct-surface-1)",
            color: "var(--ct-text-primary)",
            padding: "0.5rem 1rem",
            borderRadius: "var(--ct-radius-full)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Retour à l&apos;admin
        </Link>
      </div>
    </div>
  );
}
