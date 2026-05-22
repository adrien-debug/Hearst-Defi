import { SegmentNotFound } from "@/components/error/segment-not-found";

export default function ProductNotFound() {
  return (
    <SegmentNotFound
      scope="Produit · 404"
      message="La page que vous cherchez n'existe pas ou a été déplacée. Vérifiez l'URL ou revenez à votre portfolio."
      homeHref="/portfolio"
      homeLabel="Aller au portfolio"
    />
  );
}
