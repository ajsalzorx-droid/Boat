// The menu book (/menu-book, src/components/MenuBook.tsx) as a PDF to download. For a new edition,
// replace this file in public/, the page pictures in public/images/menu-book and the dish names in
// src/data/menu-book.ts.
export const MENU_BOOK_PDF_URL = "/boat-seafood-menu.pdf";
export const MENU_BOOK_PDF_NAME = "BOAT-Seafood-Restaurant-Menu.pdf";

export const MENU_BOOK_PAGE_COUNT = 10;

// Page width / height of the printed menu
export const MENU_BOOK_RATIO = 1500 / 3313;

// The picture of a page (0 = cover), or its thumbnail
export const menuBookImage = (page: number, small = false) =>
  `/images/menu-book/p${String(page + 1).padStart(2, "0")}${small ? "-small" : ""}.webp`;

// The pages open together. Two pages: cover, 2–3, 4–5, …, back cover. One page: each on its own.
export function menuBookViews(twoPages: boolean): number[][] {
  const pages = Array.from({ length: MENU_BOOK_PAGE_COUNT }, (_, i) => i);
  if (!twoPages) return pages.map((i) => [i]);
  const views = [[0]];
  for (let i = 1; i < pages.length; i += 2) views.push(pages.slice(i, i + 2));
  return views;
}
