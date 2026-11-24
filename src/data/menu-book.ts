// The pages of the printed menu, in order, for the menu book (src/components/MenuBook.tsx). Each page
// is the menu PDF's page as a picture (public/images/menu-book/pNN.webp, and pNN-small.webp for the
// thumbnails). The PDF holds no text, so the sections and dishes are listed here: they are what
// the book's search, Google and screen readers read. No prices, so they cannot go out of date.
export type MenuBookPage = { title: string; sections: { name: string; dishes: string[] }[] };

const page = (title: string, sections: Record<string, string>): MenuBookPage => ({
  title,
  sections: Object.entries(sections).map(([name, dishes]) => ({ name, dishes: dishes.split(", ") })),
});

export const MENU_BOOK_PAGES: MenuBookPage[] = [
  { title: "Cover", sections: [] },
  page("Soups & Salads", {
    Soups:
      "Seafood Soup, Boat Soup, Chef Soup, Shrimps Soup, Alexandrian Shrimp Soup, Saffron Seafood Soup, Tomyum Soup, Caviar Soup, Mulakhiya With Shrimps",
    Salads:
      "Green Salad, Tahina Salad, Baba Ganoush Salad, Fattoush Salad, Roca Salad, Tabouleh Salad, Tuna Salad, Herring Salad, Tomato Eggplant, Garlic Sauce, Dynamite Sauce, Mayonnaise, Boat Sauce, Raw Mango Salad, Seafood Salad, Shrimps Cocktail Salad",
  }),
  page("Rice, Pasta & Boat Special", {
    "Rice & Pasta":
      "Sayadiya Rice, Basmati Rice, Egyptian White Rice, Sayadiya Rice Special, Shrimps Rice, Seafood Rice, Boat Special Rice With Mayonnaise, Seafood Paella, White Herb Rice With Shrimp, Shrimps Fatta, White Rice With Curry Sauce, Moammer Rice With Shrimp, Pineapple Seafood Rice, Pasta Seafood Spaghetti / Penne, Pasta Shrimp Spaghetti / Penne, Bechamel Pasta",
    "Boat Special":
      "French Fries, Mussels, Crab With Cheese, Dynamite Shrimps, Shrimps Sweet & Sour, Shrimps Butter Lemon, Shrimp Sweet Chilli Sauce, Fish & Chips",
  }),
  page("Boat Bucket & Special Mix", {
    "Boat Special":
      "Calamari Stuffed Seafood, Calamari Fry, Shrimps Kofta, Shrimps Butterfly, Fajita Seafood, Fajita Shrimps, Fajita Squid, Salmon Grill With Vegetable, Oscar Tussi Fillet, Porto Vino Fillet, Potato Tray Lemon Oil",
    "Boat Bucket": "Seafood Bucket Large, Seafood Bucket Medium, Shrimps Bucket",
    "Special Mix Seafood": "Mix Seafood, Chef Mix, Captain Mix, Boat's Special Mix",
  }),
  page("Tagines & Meals", {
    Tagines:
      "Seafood Tagine, Boat Tagine, Shrimps Tagine, Squid Tagine, Fillet Tagine, Caviar Tagine, Caviar Basbousa, Kofta Tagine, Chef Saber's Tagine, Chef Tagine, Seafood Moussakka",
    Meals: "Boat Meal, Seabream Meal, Seabass Meal, King Fish Meal, Sherry Meal, Tilapia Meal, Buri Meal",
  }),
  page("Starters, Rice & Curry", {
    Starters: "Mathi Kanthari Peera, Fish Ilayil Tawa, King Fish Dry Fry, Thaikkudam Prawns, Shrimps Dry Fry",
    Rice: "Chemmeen Choru, Zurbiyani Rice, Ghee Rice, Seafood Mixed Fried Rice, Seafood Noodles",
    "Curry Flavours": "Fish Mulakittathu, Thenga Aracha Curry, Fish Mango Curry",
  }),
  page("Tawa & Chef Specials", {
    "Tawa Specials": "Red Chilli Tawa, Green Chilli Tawa, Mango Chilli Tawa",
    "Chef Specials":
      "Squid Roast, Fish Mango Pollichathu, Thalacurry, Kuttanaadan Crab Roast, Mannarkudi Crab Roast, Malabari Prawns Tawa, Malabar Seafood Platter",
    "Dampa Seafood": "Dampa Bucket Seafood, Dynamo Fish, Sweet & Sour Fish",
  }),
  page("Fish", {
    Fish: "Shrimp Medium, Shrimp Large, Lobster, Crab, Seabream, Seabass, Salmon, Sherry, Tilapia, Bury (Biah), Hamour, Hamour Fillet, Kingfish, Sultan Ibrahim, Calamari, Squid, Mussels",
  }),
  page("Breads, Drinks & Juices", {
    Breads: "Porota, Chappathi, Idiyappam, Arabic Bread",
    "Drink & Tea": "Water, Soft Drinks, Small Tea, Medium Tea, Big Tea",
    Juices:
      "Cocktail, Fresh Lemon Juice, Fresh Lemon And Mint, Fresh Orange Juice, Fresh Pineapple, Pomegranate Juice, Fresh Watermelon, Fresh Mango Juice, Strawberry Juice, Avocado Juice",
  }),
  { title: "Back cover", sections: [] },
];
