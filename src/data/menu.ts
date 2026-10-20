// Menu categories in display order (menu page tabs, menu book pages)
export const MENU_CATEGORIES = [
  "Appetizers",
  "Soups & Salads",
  "Main Courses",
  "Signature Dishes",
  "Sharing Platters",
  "Market Fresh",
  "Desserts",
  "Beverages",
];

export interface MenuItem {
  id: string;
  tag: string;
  name: string;
  description: string;
  image: string;
  price: string;
  category: string;
  dietary?: string[];
  tall?: boolean;
  wide?: boolean;
}

export const menuItems: MenuItem[] = [
  {
    id: "whole-lobster",
    tag: "Signature",
    name: "Classic Lobster Thermidor",
    description: "Creamy cognac sauce, gruyere crust, herb-infused butter.",
    image: "/images/custom/menu_lobster_thermidor_1777327128991.png",
    price: "245",
    category: "Signature Dishes",
    dietary: ["Gluten-Free Option"],
    tall: true,
  },
  {
    id: "grand-plateau",
    tag: "Sharing",
    name: "Signature Seafood Platter",
    description: "King crab, oysters, jumbo shrimp, calamari, mussels.",
    image: "/images/custom/menu_seafood_tower_platter_1777327161161.png",
    price: "480",
    category: "Sharing Platters",
  },
  {
    id: "king-crab",
    tag: "Premium",
    name: "Alaskan King Crab Legs",
    description: "Steamed Alaskan king crab with drawn butter and lemon.",
    image: "/images/custom/menu_alaskan_king_crab.png",
    price: "310",
    category: "Market Fresh",
    dietary: ["Gluten-Free"],
  },
  {
    id: "sea-bass",
    tag: "Market Fresh",
    name: "Mediterranean Sea Bass",
    description: "Whole-roasted with sea salt and citrus.",
    image: "/images/custom/menu_seabass_mediterranean_1777327177113.png",
    price: "185",
    category: "Main Courses",
    dietary: ["Gluten-Free"],
  },
  {
    id: "oysters",
    tag: "Appetizer",
    name: "Finest Selection of Oysters",
    description: "Freshly shucked daily with signature mignonette.",
    image: "/images/custom/menu_fresh_oysters_platter_1777327192111.png",
    price: "120",
    category: "Appetizers",
    dietary: ["Gluten-Free"],
    wide: true,
  },
  {
    id: "tiger-prawn",
    tag: "House Favourite",
    name: "Grilled Tiger Prawns",
    description: "Garlic-lemon infusion, signature spice rub.",
    image: "/images/custom/menu_tiger_prawns_grilled_1777327142301.png",
    price: "165",
    category: "Main Courses",
    dietary: ["Spicy"],
  },
  {
    id: "calamari-fritti",
    tag: "Classic",
    name: "Crispy Calamari Fritti",
    description: "Lightly battered squid rings with spicy marinara sauce.",
    image: "/images/custom/menu_calamari_fritti.png",
    price: "75",
    category: "Appetizers",
  },
  {
    id: "burrata-salad",
    tag: "Fresh",
    name: "Burrata & Heirloom Tomato",
    description: "Creamy burrata, balsamic glaze, fresh basil, extra virgin olive oil.",
    image: "https://images.pexels.com/photos/1211887/pexels-photo-1211887.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    price: "85",
    category: "Soups & Salads",
    dietary: ["Vegetarian"],
  },
  {
    id: "chocolate-fondant",
    tag: "Sweet",
    name: "Belgian Chocolate Fondant",
    description: "Warm chocolate cake with molten center, vanilla bean gelato.",
    image: "https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    price: "55",
    category: "Desserts",
    dietary: ["Vegetarian"],
  },
  {
    id: "classic-mojito",
    tag: "Refreshing",
    name: "Classic Mint Mojito",
    description: "Fresh mint, lime juice, sparkling water, splash of cane syrup.",
    image: "https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg?auto=compress&cs=tinysrgb&w=800&q=80",
    price: "35",
    category: "Beverages",
  },
  {
    id: "passion-fruit-mocktail",
    tag: "Exotic",
    name: "Passion Fruit Fusion",
    description: "Tropical passion fruit, orange zest, pomegranate seeds.",
    image: "/images/custom/menu_passion_fruit_fusion.png",
    price: "38",
    category: "Beverages",
  }
];
