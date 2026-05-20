import { AdminRailIntra } from "@/components/nav/product-rail-intra";

export const metadata = {
  title: "Admin — Hearst Connect",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminRailIntra />
      {children}
    </>
  );
}
