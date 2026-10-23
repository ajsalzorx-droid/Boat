import { notFound } from "next/navigation";
import { STUDIO_PAGES } from "@/lib/content";
import PageEditor from "./PageEditor";

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = STUDIO_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  return <PageEditor key={page.slug} slug={page.slug} />;
}
