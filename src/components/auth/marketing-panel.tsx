/**
 * MarketingPanel — left column of the S0 landing / login split-screen.
 *
 * Pendant symétrique du LoginPanel (à droite) :
 *   - même eyebrow (.eyebrow accent)
 *   - même H1 (.h1 cockpit)
 *   - même sous-titre body-sm
 *   - même disclaimer body-xs
 *   - même rythme vertical (gap entre blocs)
 *
 * Design-lock : tokens uniquement, accent --ct-accent, dark, glassmorphism.
 * Non-negotiables : APY range #1, "not guaranteed" #10, no forbidden words #5.
 */
import Image from "next/image";

export function MarketingPanel() {
  return (
    <div
      className="flex flex-col items-center text-center w-full"
      style={{ gap: "var(--ct-space-8)", maxWidth: "24rem" }}
    >
      <Image
        src="/logos/hearst-connect-dark.svg"
        alt="Hearst Connect"
        width={831}
        height={294}
        style={{ height: "4.5rem", width: "auto", display: "block" }}
        priority
      />

      <h1 className="h2" style={{ fontWeight: 500, lineHeight: 1.3 }}>
        Institutional yield, backed by{" "}
        <span style={{ color: "var(--ct-accent)" }}>Bitcoin mining</span>
      </h1>
    </div>
  );
}
