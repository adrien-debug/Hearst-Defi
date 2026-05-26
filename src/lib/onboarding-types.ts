/**
 * Onboarding path definitions — pure types, safe to import from both server and
 * client components.
 *
 * Three divergent LP paths:
 *   individual  — private investor KYC → accreditation → bank wire
 *   corporate   — entity docs → UBO → KYC officer → bank wire
 *   fund        — fund formation → AML → sub-advisor → master account
 */

export const ONBOARDING_PATHS = ["individual", "corporate", "fund"] as const;
export type OnboardingPath = (typeof ONBOARDING_PATHS)[number];

export interface OnboardingStep {
  id: string;
  label: string;
  /** Short description surfaced under the step label in the stepper */
  description: string;
}

export const STEPS_BY_PATH: Record<OnboardingPath, readonly OnboardingStep[]> =
  {
    individual: [
      {
        id: "kyc",
        label: "Identity Verification",
        description: "KYC via Persona — government-issued ID required",
      },
      {
        id: "accreditation",
        label: "Accreditation",
        description: "Confirm accredited investor status",
      },
      {
        id: "bank-wire",
        label: "Bank Wire Setup",
        description: "Provide wire instructions for USDC distributions",
      },
    ],
    corporate: [
      {
        id: "entity-docs",
        label: "Entity Documents",
        description: "Certificate of incorporation, operating agreement",
      },
      {
        id: "ubo",
        label: "UBO Declaration",
        description: "Declare all ultimate beneficial owners ≥ 10%",
      },
      {
        id: "kyc-officer",
        label: "KYC Officer Review",
        description: "Compliance officer identity verification",
      },
      {
        id: "bank-wire",
        label: "Bank Wire Setup",
        description: "Provide wire instructions for USDC distributions",
      },
    ],
    fund: [
      {
        id: "fund-formation",
        label: "Fund Formation Docs",
        description: "LPA, PPM, audited financial statements",
      },
      {
        id: "aml",
        label: "AML Compliance",
        description: "AML compliance officer designation and policies",
      },
      {
        id: "sub-advisor",
        label: "Sub-Advisor Confirmation",
        description: "Confirm delegated investment authority",
      },
      {
        id: "master-account",
        label: "Master Account Setup",
        description: "Configure omnibus account and allocation keys",
      },
    ],
  };

export const PATH_META: Record<
  OnboardingPath,
  { title: string; subtitle: string; icon: string }
> = {
  individual: {
    title: "Individual Investor",
    subtitle: "For accredited individuals and family offices",
    icon: "person",
  },
  corporate: {
    title: "Corporate Entity",
    subtitle: "For corporations, LLCs, and partnerships",
    icon: "building",
  },
  fund: {
    title: "Fund of Funds",
    subtitle: "For institutional funds with sub-advisor structures",
    icon: "chart",
  },
};

/** Narrow an unknown string to a valid OnboardingPath (returns null if invalid) */
export function parseOnboardingPath(raw: string): OnboardingPath | null {
  if ((ONBOARDING_PATHS as readonly string[]).includes(raw)) {
    return raw as OnboardingPath;
  }
  return null;
}
