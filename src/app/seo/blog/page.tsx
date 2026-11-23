import BlogPostList from "./BlogPostList";

// SEO Studio -> Blog
export default function StudioBlogList() {
  return (
    <div className="px-4 md:px-8 py-6 md:py-8 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1">Blog</h1>
        <p className="text-sm md:text-base text-gray-500 max-w-2xl">
          Write posts with photos, alt text and links. Drafts stay hidden; a post is on the website (and in the sitemap
          for Google) only once you publish it. Posts are shown at{" "}
          <a href="/blog" target="_blank" className="text-ocean underline">
            /blog
          </a>
          .
        </p>
      </div>
      <BlogPostList />
    </div>
  );
}
