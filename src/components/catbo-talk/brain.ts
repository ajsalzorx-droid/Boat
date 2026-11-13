import type { CatboData } from "./types";

// What Catbo knows, and how it answers. A question (typed, spoken, or one of the ready-made ones)
// is matched by its words to a topic: the restaurant, the offers, the menu (a section of it, or a
// dish), today's catch, where we are, the hours, booking, cooking your own fish, contact, delivery.
// Answers come from the live data only; when it does not know, it says so and points to WhatsApp.
// Many answers end with an offer to go somewhere ("Do you want to see the menu?"): the visitor's
// next "yes" (or "no") answers that.

export type Go = "menu" | "map" | "book" | "whatsapp" | "order";
export type Reply = {
  text: string;
  ask?: Go; // the offer the next yes / no answers
  happy?: boolean;
};

// The ready-made questions shown as buttons
export const QUESTIONS = [
  "Tell me about Boat Seafood",
  "Any offers today?",
  "What's on the menu?",
  "What's fresh today?",
  "Where are you?",
  "What are your hours?",
  "Can I book a table?",
  "Can you cook my fish?",
  "How do I contact you?",
];

export const ASKS: Record<Go, string> = {
  menu: "Do you want to see our menu?",
  map: "Shall I open the map for directions?",
  book: "Shall I open the booking page?",
  whatsapp: "Shall I open WhatsApp for you?",
  order: "Shall I open Talabat so you can order?",
};

type Topic = "about" | "offers" | "menu" | "fresh" | "where" | "hours" | "book" | "cook" | "contact" | "delivery" | "greet" | "thanks" | "bye" | "joke";

// Words that point to each topic (English, with a little Manglish and Arabic)
const WORDS: Record<Topic, string[]> = {
  offers: ["offer", "offers", "discount", "deal", "deals", "promo", "promotion", "sale", "percent", "%", "kuravu", "off"],
  menu: ["menu", "dish", "dishes", "food", "eat", "price", "prices", "cost", "how much", "starter", "starters", "dessert", "desserts", "drink", "drinks", "salad", "soup", "platter", "lobster", "crab", "prawn", "prawns", "shrimp", "oyster", "kazhikkan", "bhakshanam", "vila"],
  fresh: ["fresh", "catch", "today's fish", "todays fish", "fish today", "daily", "market fish", "pidicha"],
  where: ["where", "location", "address", "directions", "direction", "map", "find you", "reach", "located", "evide", "sthalam", "waterfront", "deira", "how to get", "near"],
  hours: ["open", "opening", "close", "closing", "hours", "timing", "timings", "time", "when", "today open", "samayam", "eppo"],
  book: ["book", "booking", "reserve", "reservation", "table", "seat", "seats", "party"],
  cook: ["cook", "cooks", "cooked", "cook my fish", "bring my fish", "bring fish", "my own fish", "my fish", "i buy", "bought", "cooking", "grill my", "fry my", "tawa", "curry", "prepare", "chef", "chefs"],
  contact: ["contact", "phone", "call", "number", "whatsapp", "email", "mail", "talk to someone", "staff"],
  delivery: ["delivery", "deliver", "order online", "online order", "talabat", "home", "takeaway", "take away", "parcel"],
  about: ["about", "who are you", "what is boat", "boat seafood", "restaurant", "company", "story", "tell me about", "yourself", "concept", "what do you do", "enthanu", "aaranu"],
  greet: ["hi", "hello", "hey", "hai", "salam", "assalamu", "namaskaram", "good morning", "good evening", "good afternoon", "yo"],
  thanks: ["thanks", "thank you", "thank", "nanni", "shukran", "thx", "great", "awesome", "nice"],
  bye: ["bye", "goodbye", "see you", "good night", "pinne kaanam"],
  joke: ["joke", "funny", "laugh", "tamasha"],
};
// When two topics score the same, the earlier one wins
const ORDER: Topic[] = ["offers", "cook", "delivery", "book", "fresh", "menu", "where", "hours", "contact", "about", "joke", "bye", "thanks", "greet"];

const YES = /^(yes|yeah|yea|yep|yup|sure|ok|okay|k|please|yes please|of course|go|go ahead|show me|open|open it|why not|definitely|haan|ha|aa|aam|athe|venam|sheri|sari|ok da|fine|alright)\b/;
const NO = /^(no|nope|nah|not now|later|no thanks|dont|don't|venda|illa|vendaa|maybe later)\b/;

const JOKES = [
  "Why don't fish play basketball? They're afraid of the net!",
  "What do you call a fish with no eyes? A fsh!",
  "What's a cat's favourite seafood? Sar-meow-n!",
  "Why are fish so smart? They live in schools!",
];

const clean = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9%' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
const has = (text: string, word: string) => text.includes(` ${word} `) || (word.includes(" ") && text.includes(word));
const aed = (n: number) => `AED ${Number.isInteger(n) ? n : n.toFixed(2)}`;
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

// "23:00" -> "11 pm"
function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 && h < 24 ? "pm" : "am"}`;
}
function until(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `, until ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Dubai" })}`;
}

// A section of the menu the question names, if any
const SECTIONS: [RegExp, string][] = [
  [/\b(appetizers?|starters?|snacks?)\b/, "Appetizers"],
  [/\b(soups?|salads?)\b/, "Soups & Salads"],
  [/\b(mains?|main course|main courses)\b/, "Main Courses"],
  [/\b(signature|special|specials|chef'?s)\b/, "Signature Dishes"],
  [/\b(platters?|sharing|share|family)\b/, "Sharing Platters"],
  [/\bmarket fresh\b/, "Market Fresh"],
  [/\b(desserts?|sweets?|cake|ice cream)\b/, "Desserts"],
  [/\b(drinks?|beverages?|juices?|mocktails?|coffee|tea)\b/, "Beverages"],
];

export function answer(said: string, data: CatboData, pending: Go | null): Reply {
  const seen = new Set<string>();
  const d = { ...data, dishes: data.dishes.filter((x) => !seen.has(x.name) && !!seen.add(x.name)) }; // one of each dish
  const text = clean(said);
  const words = text.trim();

  // A yes or no to Catbo's last offer
  if (pending && YES.test(words)) return { text: "", ask: pending }; // the caller goes there
  if (pending && NO.test(words) && words.split(" ").length <= 4) return { text: "No problem! What else would you like to know? Ask me about our menu, offers or location." };
  if (!pending && YES.test(words) && words.split(" ").length <= 2) return { text: "Great! What would you like to know? Try the menu, our offers or where we are." };

  // A dish by name
  const dish = d.dishes
    .map((x) => ({ x, hits: x.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && has(text, w)).length }))
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits)[0];

  // The topic with the most words in the question
  const score = (t: Topic) => WORDS[t].reduce((n, w) => n + (has(text, w) ? 1 : 0), 0);
  let topic: Topic | null = null;
  let best = 0;
  for (const t of ORDER) {
    const s = score(t);
    if (s > best) [topic, best] = [t, s];
  }
  const section = SECTIONS.find(([re]) => re.test(text))?.[1];
  if (dish && (topic === null || topic === "menu")) return dishReply(dish.x);
  if (section && (topic === null || topic === "menu")) return sectionReply(section, d);

  switch (topic) {
    case "offers": {
      if (!d.offers.length)
        return {
          text: "There are no offers running right now, but we add new ones often, so check back soon. Our fresh seafood is always worth it though!",
          ask: "menu",
        };
      const each = d.offers.map(
        (o) => `${o.title}: ${o.percent}% off ${o.covers}${o.description ? `. ${o.description.replace(/\.$/, "")}` : ""}${until(o.endsAt)}`,
      );
      return { text: `Yes! ${d.offers.length === 1 ? "We have an offer on now" : `We have ${d.offers.length} offers on now`}. ${each.join(". ")}.`, ask: "menu", happy: true };
    }
    case "menu": {
      const sections = d.categories.map((c) => c.name);
      const offer = d.dishes.filter((x) => x.discount).slice(0, 2);
      const picks = d.dishes.filter((x) => /signature|platter|main/i.test(x.category)).slice(0, 3);
      return {
        text: `Our menu has ${list(sections)}. ${picks.length ? `Favourites include ${list(picks.map((x) => `${x.name} at ${aed(x.price)}`))}.` : ""}${
          offer.length ? ` And ${list(offer.map((x) => x.name))} ${offer.length > 1 ? "are" : "is"} on offer right now!` : ""
        }`,
        ask: "menu",
        happy: true,
      };
    }
    case "fresh": {
      const fish = [...new Set(d.fresh.map((f) => f.name))].slice(0, 5);
      return fish.length
        ? { text: `Fresh in today: ${list(fish)}. My whiskers are twitching just saying it!`, ask: "menu", happy: true }
        : { text: "The boats are still out! Ask our team what came in fresh today.", ask: "whatsapp" };
    }
    case "where":
      return { text: `We're at ${d.place}, right in the Waterfront Market. Come hungry!`, ask: "map" };
    case "hours":
      return { text: `We're open every day from ${clock(d.opens)} to ${clock(d.closes)}.`, ask: "book" };
    case "book":
      return { text: "Yes! You can reserve a table, or book our chefs to cook the fish you buy at the market.", ask: "book", happy: true };
    case "cook":
      return {
        text: "Of course! Buy your fish at the Waterfront Market and our chefs will cook it for you: grilled, fried, tawa or curry. You can book it ahead online.",
        ask: "book",
        happy: true,
      };
    case "contact":
      return { text: `Call us on ${d.phone.replace(/\s+/g, " ")}, or message us on WhatsApp.`, ask: "whatsapp" };
    case "delivery":
      return { text: "You can order Boat Seafood online through Talabat, delivered to your door.", ask: "order" };
    case "about":
      return {
        text: `${d.name} is a seafood restaurant at ${d.place}. We cook the freshest catch: pick from our menu, or bring fish from the market and our chefs will cook it for you, grilled, fried, tawa or curry. And I'm Catbo, the ship's cat!`,
        ask: "menu",
        happy: true,
      };
    case "greet":
      return { text: "Hello! I'm Catbo, the ship's cat. Ask me about our menu, today's offers, the fresh catch or where to find us!", happy: true };
    case "thanks":
      return { text: "You're welcome! Anything else I can help you with?", happy: true };
    case "bye":
      return { text: "Bye bye! Come and see us at the Waterfront Market. Meow!", happy: true };
    case "joke":
      return { text: JOKES[Math.floor(Math.random() * JOKES.length)], happy: true };
  }
  return {
    text: "Hmm, I'm not sure about that one. Our team can help on WhatsApp, or ask me about our menu, offers, hours or location.",
    ask: "whatsapp",
  };

  function dishReply(x: CatboData["dishes"][number]): Reply {
    const now = x.discount ? Math.round(x.price * (1 - x.discount / 100) * 100) / 100 : 0;
    return {
      text: `${x.name} is ${aed(x.price)}${now ? `, and right now it's ${x.discount}% off: just ${aed(now)}!` : "."} ${x.description}`.trim(),
      ask: "menu",
      happy: !!now,
    };
  }
}

function sectionReply(name: string, d: Pick<CatboData, "dishes">): Reply {
  const inIt = d.dishes.filter((x) => x.category === name);
  if (!inIt.length) return { text: `We don't have anything in ${name} right now, but the rest of the menu is full of good things!`, ask: "menu" };
  return {
    text:
      inIt.length === 1
        ? `In ${name} we have ${inIt[0].name} at ${aed(inIt[0].price)}.`
        : `In ${name} we have ${inIt.length} dishes, like ${list(inIt.slice(0, 3).map((x) => `${x.name} at ${aed(x.price)}`))}.`,
    ask: "menu",
  };
}
