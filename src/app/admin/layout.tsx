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
    <div className="ct-page-area">
      <AdminRailIntra />
      <main className="mx-auto max-w-screen-2xl px-8 py-12">{children}</main>
    </div>
  );
}
