import ProfileBook from "@/components/ProfileBook";
import { pageMetadata } from "@/lib/seo-data";

export const generateMetadata = () => pageMetadata("/profile");

// The printed BOAT company profile brochure as a flip book, page for page (the menu is at /menu-book)
export default ProfileBook;
