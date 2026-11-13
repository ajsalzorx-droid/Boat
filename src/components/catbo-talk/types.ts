// What Catbo knows about: loaded on the server with the home page (see src/app/page.tsx), so it
// always answers with the live offers, today's catch, the menu as it is now and the real hours
export type CatboData = {
  name: string;
  place: string; // street, area and city
  phone: string;
  opens: string; // "12:00"
  closes: string; // "23:00"
  offers: {
    title: string;
    percent: number;
    description: string;
    endsAt: string | null; // ISO
    covers: string; // "everything on the menu", "Main Courses and Desserts", "Lobster Thermidor and Grilled Hammour"
  }[];
  fresh: { name: string; origin: string }[];
  categories: { name: string; count: number; from: number }[]; // menu sections, dishes in each, lowest price
  dishes: { name: string; price: number; category: string; description: string; discount?: number }[];
  links: { menu: string; book: string; map: string; whatsapp: string; order: string };
};
