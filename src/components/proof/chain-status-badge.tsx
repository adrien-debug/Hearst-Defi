import { Badge } from "@/components/ui/badge";

interface ChainStatusBadgeProps {
  configured: boolean;
  eventCount: number;
  attestationCount: number;
}

export function ChainStatusBadge({
  configured,
  eventCount,
  attestationCount,
}: ChainStatusBadgeProps) {
  if (!configured) {
    return (
      <Badge
        variant="warning"
        title="No EventLogger/PoRRegistry address configured. Phase 2 contracts are not yet deployed. Showing paper attestations only."
      >
        Off-chain · paper attestations only
      </Badge>
    );
  }

  const total = eventCount + attestationCount;
  if (total === 0) {
    return (
      <Badge
        variant="default"
        title="Contracts are configured on Base Sepolia but no events have been published yet."
      >
        Connected · Base Sepolia · no on-chain events yet
      </Badge>
    );
  }

  const parts: string[] = [];
  if (eventCount > 0) {
    parts.push(`${eventCount} event${eventCount === 1 ? "" : "s"}`);
  }
  if (attestationCount > 0) {
    parts.push(
      `${attestationCount} attestation${attestationCount === 1 ? "" : "s"}`,
    );
  }

  return (
    <Badge
      variant="success"
      title="Reading EventLogger + PoRRegistry events directly from Base Sepolia."
    >
      Connected · Base Sepolia · {parts.join(" + ")}
    </Badge>
  );
}
