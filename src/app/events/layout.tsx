import { pageMetadata } from "@/lib/seo";

// The page is a Client Component, so its SEO (from the SEO Studio, /seo) is set here
export const generateMetadata = () => pageMetadata("/events");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
