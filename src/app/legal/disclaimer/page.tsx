import "../legal.css";

export const dynamic = "force-static";

export const metadata = {
  title: "Risk Disclaimer",
  description: "Risk factors specific to Hearst Connect — DeFi, mining, custody, smart contracts.",
};

export default function DisclaimerPage() {
  return (
    <>
      <h1>Risk Disclaimer</h1>
      <p className="legal-meta">Draft — pending formal legal review.</p>

      <div className="legal-stub">
        <strong>Engineering draft</strong>
        <p>
          The risk factors below reflect the actual architecture of the product
          (mining-backed yield, USDC distributions, Cayman SPV, custody
          provider, smart contracts on Base). The legal language must be
          reviewed and finalized by qualified counsel.
        </p>
      </div>

      <p>
        Investment in Hearst Yield Vault involves substantial risk, including
        loss of principal. APY ranges shown in the product are target
        projections based on disclosed assumptions; they are not guarantees,
        commitments, or predictions of future returns. Past performance does
        not predict future results.
      </p>

      <h2>1. Market &amp; mining risk</h2>
      <p>
        Yield is sourced from bitcoin mining operations. Mining revenue is
        sensitive to bitcoin price, network hashprice, energy costs, halving
        events, hardware availability, and regulatory action in mining
        jurisdictions. Adverse moves in any of these factors can reduce or
        eliminate distributions.
      </p>

      <h2>2. Smart contract risk</h2>
      <p>
        On-chain components (ERC-4626 vault, event logger, proof-of-reserves
        registry) are deployed on Base. Smart contracts may contain
        undiscovered vulnerabilities. Mainnet deployment of the vault is gated
        on completion of a third-party security audit (Spearbit) and
        remediation of any findings. Even after audit, residual risk remains.
      </p>

      <h2>3. Custody risk</h2>
      <p>
        Underlying assets are held with an institutional custody provider
        (Fireblocks). Proof-of-reserves attestations are published on a regular
        cadence. Custody failure, key compromise, or operational error at the
        custodian could result in loss.
      </p>

      <h2>4. Liquidity &amp; lock-up risk</h2>
      <p>
        Subscriptions carry a 60-day soft lock-up. Withdrawals are processed at
        scheduled valuation points and may be deferred or gated in exceptional
        liquidity events. You should not subscribe with funds you may need on
        short notice.
      </p>

      <h2>5. Regulatory &amp; jurisdiction risk</h2>
      <p>
        The SPV is incorporated in the Cayman Islands. Regulatory frameworks
        applicable to digital assets, mining, and structured DeFi products
        continue to evolve. Changes in law or enforcement could materially
        affect the product or your ability to participate.
      </p>

      <h2>6. Stablecoin &amp; redemption risk</h2>
      <p>
        Distributions and redemptions are settled in USDC. USDC is a
        third-party issued stablecoin; its peg, redemption rights, and
        compliance posture are outside Hearst's control.
      </p>

      <h2>7. Operational &amp; counterparty risk</h2>
      <p>
        The product depends on third-party infrastructure (custody, hosting,
        oracles, KYC processors). Operational failure at any counterparty could
        affect product availability, distributions, or attestations.
      </p>

      <h2>8. Tax</h2>
      <p>
        Tax treatment depends on your jurisdiction and personal circumstances.
        Hearst does not provide tax advice. Consult your own advisor.
      </p>

      <h2>9. No guarantee</h2>
      <p>
        Nothing in the product communicates a guarantee, promise, or
        risk-free return. The APY range is an estimate. Distributions are not
        guaranteed. Capital is at risk.
      </p>
    </>
  );
}
