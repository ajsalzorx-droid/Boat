import { pageMetadata } from "@/lib/seo-data";

export const generateMetadata = () => pageMetadata("/links");

export default function LinksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
