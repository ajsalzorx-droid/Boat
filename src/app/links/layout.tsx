import { pageMetadata } from "@/lib/seo";

export const generateMetadata = () => pageMetadata("/links");

export default function LinksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
