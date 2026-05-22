// Investor-facing Proof Center — same data as /admin/proof-center
// but accessible with investor auth (not admin-only).
// The (product) layout already enforces requireInvestor().

export const dynamic = "force-dynamic";

import AdminProofCenterPage from "@/app/admin/proof-center/page";
export default AdminProofCenterPage;
