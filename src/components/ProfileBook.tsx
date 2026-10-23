import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import FlipBook from "@/components/FlipBook";
import { BROCHURE_RATIO, BrochureBackdrop } from "@/components/Brochure";
import { cdn } from "@/lib/cdn";

// The printed BOAT PROFILE-26 brochure as a flipbook, page for page, like the Heyzine version.
// Each page is the PDF page rendered to an image (images/profile/pages/pNN.webp on Cloudinary), so the
// design is exactly the brochure's. Text pages use the page rendered without its text
// (pNN-bg.webp) with the text set over it in HTML, larger than the print so it reads on screen.
// Other pages keep their text as hidden HTML for Google and screen readers. Links are laid over
// the QR codes and contact details.

// Clickable areas, in artwork px (1418 × 840)
type Hotspot = { href: string; label: string; x: number; y: number; w: number; h: number };

const MENU_QR: Hotspot = { href: "/menu", label: "Open the BOAT menu", x: 96, y: 650, w: 86, h: 86 };

// Where a text page's text starts (cqw from the top), and whether it opens with the
// "BOAT SEAFOOD RESTAURANT" line; dense pages use a slightly smaller size to fit
type TextLayout = { top: number; brand?: boolean; dense?: boolean; centered?: boolean };

type BookPage = { title: string; alt: string; hard?: boolean; text?: ReactNode; layout?: TextLayout; links?: Hotspot[] };

const pages: BookPage[] = [
  {
    title: "Cover",
    alt: "BOAT Seafood Restaurant at night, with guests dining on the terrace",
    text: (
      <>
        <h1>BOAT Seafood Restaurant — Profile</h1>
        <p>Freshness in every catch. Authenticity in every flavour. Hospitality in every moment.</p>
        <p>boatseafood.com</p>
      </>
    ),
  },
  { title: "Inside cover", alt: "" },
  { title: "BOAT Seafood Restaurant", alt: "BOAT Seafood Restaurant logo" },
  {
    title: "01. We Are",
    layout: { top: 14.4, brand: true },
    alt: "01. We Are",
    text: (
      <>
        <h2>01. We Are</h2>
        <p>
          <strong>BOAT Seafood Restaurant</strong> is a destination for authentic seafood dining, where freshness, flavour, hospitality, and memorable experiences
          come together.
        </p>
        <p>
          Located at the iconic Waterfront Market, overlooking Dubai&apos;s vibrant waterfront, BOAT celebrates the rich culinary traditions of the
          Arabian region and India, bringing the finest seafood preparations to one welcoming destination.
        </p>
        <p>
          Our journey is guided by a clear vision: to establish BOAT as a trusted name in seafood dining, recognised for authentic taste,
          consistent quality, inviting ambience, and exceptional customer service.
        </p>
        <p>
          We believe a great restaurant is not defined by food alone. It is the harmony of fresh ingredients, skilled preparation, comfortable
          surroundings, attentive hospitality, and the satisfaction of every guest.
        </p>
        <p>At BOAT, every meal is an experience worth remembering.</p>
      </>
    ),
  },
  {
    title: "02. Our Philosophy",
    layout: { top: 14.4, brand: true },
    alt: "02. Our Philosophy",
    text: (
      <>
        <h2>02. Our Philosophy</h2>
        <p>
          <strong>&ldquo;Simply Fresh Seafood, Prepared Your Way.&rdquo;</strong>
        </p>
        <p>Our philosophy is built around simplicity, authenticity, and personal choice.</p>
        <p>
          We believe the natural freshness of seafood should always be the hero of every dish. Whether our guests prefer traditional Arabic
          flavours, rich Indian spices, charcoal grilling, oven-baked specialities, or their own customised recipes, we strive to prepare every meal
          to their individual taste.
        </p>
        <p>Your preference is our inspiration. Your satisfaction is our priority.</p>
      </>
    ),
  },
  {
    title: "A little salt, a little soul",
    alt: "Whole crab in a rich red masala",
    text: <p>A little salt, a little soul, a taste of the ocean, a story untold.</p>,
    links: [MENU_QR],
  },
  {
    title: "03. Our Culinary Specialities",
    layout: { top: 11, dense: true },
    alt: "03. Our Culinary Specialities",
    text: (
      <>
        <h2>03. Our Culinary Specialities</h2>
        <h3>01 — Authentic Arabic Seafood</h3>
        <p>
          Inspired by the rich coastal food traditions of the Arabian region, our Arabic kitchen specialises in grilled, oven-baked, and
          traditionally seasoned seafood.
        </p>
        <p>
          Fresh fish, prawns, and other seafood are prepared with carefully selected spices, marinades, and cooking techniques that preserve their
          natural flavour.
        </p>
        <h3>02 — Authentic Indian Seafood</h3>
        <p>
          Celebrating India&apos;s diverse coastal culinary heritage, our Indian kitchen offers a vibrant selection of tawa preparations, masala
          specialities, traditional fish gravies, and grilled seafood.
        </p>
        <p>From delicate spice combinations to bold regional flavours, every preparation reflects the warmth and richness of Indian cuisine.</p>
        <h3>03 — Your Fish, Our Preparation</h3>
        <p>One of BOAT&apos;s signature dining concepts gives our guests the freedom to select and bring their own fresh seafood from the market.</p>
        <p>Our culinary team then prepares it according to their preferred recipe, cooking style, and spice level.</p>
        <p>
          <strong>You bring the catch. We create the flavour.</strong>
        </p>
      </>
    ),
  },
  { title: "In the kitchen", alt: "BOAT chef grilling a whole fish over open flames" },
  {
    title: "04. Our Kitchen & Culinary Excellence",
    layout: { top: 14.4, brand: true },
    alt: "04. Our Kitchen & Culinary Excellence",
    text: (
      <>
        <h2>04. Our Kitchen &amp; Culinary Excellence</h2>
        <p>Behind every delicious meal is a kitchen designed for quality, consistency, efficiency, and hygiene.</p>
        <p>
          BOAT is equipped with modern commercial kitchen facilities that support traditional cooking techniques alongside systematic food
          preparation and professional kitchen operations.
        </p>
        <p>Our culinary approach focuses on:</p>
        <ul>
          <li>Freshness and careful selection of ingredients.</li>
          <li>Authentic recipes and consistent taste.</li>
          <li>Proper food handling, storage, and preparation.</li>
          <li>Efficient cooking processes and quality control.</li>
          <li>Customised dishes that respect our guests&apos; preferences.</li>
          <li>Continuous improvement through training and customer feedback.</li>
        </ul>
        <p>We combine the character of traditional cuisine with the discipline of modern restaurant operations.</p>
      </>
    ),
  },
  {
    title: "05. Dining Experience · 06. Digital Convenience",
    layout: { top: 7.6, brand: true, dense: true },
    alt: "05. The BOAT Dining Experience and 06. Digital Convenience & Accessibility",
    text: (
      <>
        <h2>05. The BOAT Dining Experience</h2>
        <p>At BOAT, hospitality begins the moment a guest arrives.</p>
        <p>
          Our waterfront setting, thoughtfully designed ambience, and welcoming service create an environment where families, friends, business
          associates, and seafood lovers can enjoy meaningful moments together.
        </p>
        <p>We aim to offer more than a meal: a complete dining experience shaped by comfort, cleanliness, genuine care, and personalised attention.</p>
        <p>
          Whether it is a casual lunch, family dinner, special occasion, or a gathering with friends, our goal is to make every visit enjoyable and
          memorable.
        </p>
        <h2>06. Digital Convenience &amp; Accessibility</h2>
        <p>BOAT embraces modern technology to make dining and ordering easier, faster, and more convenient.</p>
        <p>
          Our service model supports dine-in, takeaway, and online ordering, with digital ordering solutions and delivery-platform partnerships
          forming part of our customer-access strategy.
        </p>
        <p>By combining personal hospitality with digital convenience, we aim to serve our guests wherever they choose to enjoy BOAT&apos;s seafood.</p>
      </>
    ),
  },
  {
    title: "Waterfront Market",
    alt: "The crab sculpture and Waterfront Market sign at sunset",
    text: <p>A little salt, a little soul, a taste of the ocean, a story untold.</p>,
    links: [MENU_QR],
  },
  { title: "Our team", alt: "The BOAT team at the waterfront at sunset" },
  {
    title: "07. Our People · 08. Food Safety",
    layout: { top: 10.6, dense: true },
    alt: "07. Our People, Our Strength and 08. Food Safety, Health & Responsibility",
    text: (
      <>
        <h2>07. Our People, Our Strength</h2>
        <p>We believe that the success of BOAT begins with its people.</p>
        <p>
          Our chefs, kitchen assistants, service personnel, supervisors, administrative staff, and management team all contribute to one shared
          purpose: delivering a consistently excellent guest experience.
        </p>
        <p>
          We are committed to creating a professional working environment built on mutual respect, teamwork, accountability, continuous learning,
          and employee welfare.
        </p>
        <p>We recognise that staff health, safety, motivation, and professional development are essential to sustainable business success.</p>
        <p>A respected and well-supported team creates better food, better service, and happier customers.</p>
        <h2>08. Food Safety, Health &amp; Responsibility</h2>
        <p>The health and well-being of our guests and employees remain fundamental priorities.</p>
        <p>BOAT is committed to operating in accordance with applicable UAE and Dubai Municipality food safety, hygiene, and restaurant regulations.</p>
        <p>
          Our operational standards emphasise food safety, personal hygiene, cleanliness, proper equipment maintenance, safe food handling, and
          responsible restaurant management.
        </p>
        <p>We also encourage balanced food choices, freshness, and cooking methods that meet our guests&apos; preferences.</p>
        <p>For us, quality is not merely a promise. It is a responsibility practised every day.</p>
      </>
    ),
  },
  {
    title: "Born from the ocean",
    alt: "Butterflied grilled fish with red masala, lemon and tomatoes",
    text: <p>Born from the ocean, crafted with passion, served with love.</p>,
    links: [MENU_QR],
  },
  {
    title: "09. Our Vision · 10. Our Mission",
    layout: { top: 17.4, brand: true },
    alt: "09. Our Vision and 10. Our Mission",
    text: (
      <>
        <h2>09. Our Vision</h2>
        <p>
          To become a recognised and respected seafood restaurant brand, originating in Dubai and expanding across the UAE and international
          markets, while preserving our commitment to authenticity, freshness, quality, and exceptional hospitality.
        </p>
        <h2>10. Our Mission</h2>
        <p>
          To deliver memorable seafood dining experiences through authentic Arabic and Indian cuisine, fresh ingredients, personalised
          preparation, professional service, modern operational standards, and a strong commitment to customer satisfaction and employee welfare.
        </p>
      </>
    ),
  },
  { title: "Our restaurant", alt: "BOAT Seafood Restaurant storefront at Waterfront Market" },
  { title: "Inside BOAT", alt: "The BOAT dining room with ocean-blue tables and a 'Catch the wave' wall" },
  {
    title: "A Special Message to Our Team",
    layout: { top: 14.4, brand: true },
    alt: "A Special Message to Our Team",
    text: <TeamMessage />,
  },
  {
    title: "12. Our Future — Beyond the Waterfront",
    layout: { top: 14.4, brand: true },
    alt: "12. Our Future — Beyond the Waterfront",
    text: (
      <>
        <h2>12. Our Future — Beyond the Waterfront</h2>
        <p>BOAT&apos;s journey begins in Dubai, but our ambitions extend beyond a single destination.</p>
        <p>Our long-term vision is to introduce the BOAT dining culture to other parts of the UAE and selected international markets.</p>
        <p>
          We aspire to develop a scalable restaurant brand supported by standardised recipes, strong operational systems, talented people,
          distinctive branding, and consistent guest experiences.
        </p>
        <p>
          As we grow, our identity will remain rooted in the values that define us today: fresh seafood, authentic taste, personalised
          preparation, and genuine hospitality.
        </p>
      </>
    ),
  },
  {
    title: "Crafted with passion",
    alt: "Two grilled sea bream with tomato, onion and lemon",
    text: <p>Born from the ocean, crafted with passion, served with love.</p>,
    links: [MENU_QR],
  },
  {
    title: "A Special Message to Our Team",
    layout: { top: 14.4, brand: true },
    alt: "A Special Message to Our Team",
    text: <TeamMessage />,
  },
  {
    title: "Every wave brings a wonder",
    alt: "Whole grilled sea bass with herb butter and lemon",
    text: <p>Every wave brings a wonder, every catch holds a story, every taste creates a memory.</p>,
    links: [MENU_QR],
  },
  {
    title: "Our Brand Promise",
    layout: { top: 13.4, brand: true, centered: true },
    alt: "Our Brand Promise",
    text: (
      <>
        <h2>Our Brand Promise</h2>
        <p className="font-bold uppercase leading-[1.55]">
          Freshness in every catch.
          <br />
          Authenticity in every flavour.
          <br />
          Hospitality in every moment.
          <br />
          BOAT Seafood Restaurant
        </p>
        <p className="text-[0.9em]">Waterfront Market, Dubai, United Arab Emirates</p>
      </>
    ),
  },
  {
    title: "Contact us",
    alt: "Waterfront Market, Dubai, with BOAT's contact details",
    text: (
      <address>
        boatseafood.com · Tel. 971 4 324 7998 · M/W. 971 50 7487220 · 971 50 298 1902, 971 502 989 345 · boatdxb26@gmail.com
      </address>
    ),
    links: [
      { href: "https://boatseafood.com", label: "boatseafood.com", x: 220, y: 628, w: 150, h: 20 },
      { href: "tel:+97143247998", label: "Call 971 4 324 7998", x: 220, y: 652, w: 140, h: 18 },
      { href: "https://wa.me/971507487220", label: "WhatsApp 971 50 7487220", x: 220, y: 672, w: 156, h: 18 },
      { href: "tel:+971502981902", label: "Call 971 50 298 1902", x: 220, y: 692, w: 118, h: 18 },
      { href: "tel:+971502989345", label: "Call 971 502 989 345", x: 342, y: 692, w: 124, h: 18 },
      { href: "mailto:boatdxb26@gmail.com", label: "Email boatdxb26@gmail.com", x: 220, y: 711, w: 164, h: 18 },
      { href: "/menu", label: "Open the BOAT menu", x: 492, y: 637, w: 88, h: 88 },
    ],
  },
  { title: "Find us at Waterfront Market", alt: "BOAT's location on the Waterfront Market promenade" },
];

export default function ProfileBook() {
  // Standalone viewer, like a Heyzine flipbook: light grey backdrop, slim top bar, the book filling the screen
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-white text-navy">
      <BrochureBackdrop />

      <header className="relative z-10 flex h-16 short:h-11 shrink-0 items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/" aria-label="Boat Seafood home" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cdn("/logo.webp")} alt="BOAT Seafood Restaurant" className="h-12 short:h-8 w-auto" />
        </Link>
        <p className="min-w-0 truncate text-center text-[10px] font-bold uppercase tracking-[4px] text-navy/70 md:text-xs">Company Profile</p>
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-[10px] font-bold uppercase tracking-[2px] text-navy shadow-sm transition-colors hover:bg-white md:px-4"
        >
          <span className="hidden sm:inline">Visit website</span>
          <ArrowUpRight size={16} aria-hidden="true" />
          <span className="sr-only sm:hidden">Visit website</span>
        </Link>
      </header>

      <main className="relative flex flex-1 flex-col justify-center px-4 pb-6 short:px-2 short:pb-2 md:px-16">
        <FlipBook label="BOAT Seafood Restaurant profile" titles={pages.map((p) => p.title)} pageRatio={BROCHURE_RATIO} theme="light" pdfUrl="/boat-seafood-company-profile.pdf">
          {pages.map((p, i) => (
            <section
              key={i}
              className="flip-page bg-white"
              data-density={p.hard ? "hard" : "soft"}
              aria-label={`Page ${i + 1}: ${p.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cdn(`/images/profile/pages/p${String(i + 1).padStart(2, "0")}${p.layout ? "-bg" : ""}.webp`)}
                alt={p.layout ? "" : p.alt}
                loading={i < 4 ? "eager" : "lazy"}
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover"
              />
              {p.layout ? <PageText layout={p.layout}>{p.text}</PageText> : p.text && <div className="sr-only">{p.text}</div>}
              {p.links?.map((l) => (
                <a
                  key={l.href + l.x}
                  href={l.href}
                  aria-label={l.label}
                  title={l.label}
                  {...(l.href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
                  className="absolute block rounded-[0.3cqw] transition-colors hover:bg-white/15"
                  style={{
                    left: `${(l.x / 1418) * 100}%`,
                    top: `${(l.y / 840) * 100}%`,
                    width: `${(l.w / 1418) * 100}%`,
                    height: `${(l.h / 840) * 100}%`,
                  }}
                />
              ))}
            </section>
          ))}
        </FlipBook>
      </main>
    </div>
  );
}

// A text page's text over its text-free background (artwork positions, larger type)
function PageText({ layout, children }: { layout: TextLayout; children: ReactNode }) {
  return (
    <>
      {/* "boatseafood.com" beside the round badge, top right */}
      <span className="pdf-url absolute right-[14.1cqw] top-[8.1cqw] -translate-y-1/2 text-[1.35cqw]">boatseafood.com</span>
      <div
        className={`pdf-text absolute ${layout.dense ? "pdf-dense" : ""} ${layout.centered ? "inset-x-0 text-center" : "left-[24.5cqw] right-[9cqw]"}`}
        style={{ top: `${layout.top}cqw`, "--fs": layout.dense ? "1.45cqw" : "1.62cqw" } as CSSProperties}
      >
        {layout.brand && <p className={`pdf-brand ${layout.centered ? "text-[1.4em]" : ""}`}>BOAT SEAFOOD RESTAURANT</p>}
        {children}
      </div>
    </>
  );
}

function TeamMessage() {
  return (
    <>
      <h2>A Special Message to Our Team</h2>
      <p>Every member of BOAT is an ambassador of our brand.</p>
      <p>
        Our chefs create the flavours. Our service team creates the experience. Our support staff maintain the standards. Our management provides
        direction. Together, we create the reputation of BOAT.
      </p>
      <p>
        Every detail matters — from the freshness of a fish and the cleanliness of a table to a warm smile, a timely order, and a sincere farewell.
      </p>
      <p>We want every team member to take pride in their responsibilities, respect colleagues, care for guests, and contribute to continuous improvement.</p>
      <p>
        Our success is not measured only by the number of meals we serve, but by the number of guests who leave satisfied and choose to return. As
        we grow, our identity will remain rooted in the values that define us today: fresh seafood, authentic taste, personalised preparation, and
        genuine hospitality.
      </p>
    </>
  );
}
