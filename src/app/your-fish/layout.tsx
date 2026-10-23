import { pageMetadata } from "@/lib/seo-data";

// The page is a Client Component, so its SEO (from the SEO Studio, /seo) is set here
export const generateMetadata = () => pageMetadata("/your-fish");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
