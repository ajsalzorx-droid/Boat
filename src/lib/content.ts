import { cdn } from '@/lib/cdn'

// Editable page text, images, alt text and lists (edited in the SEO Studio at /seo, stored in
// site_content). The defaults below are the original site text: they are shown until a section
// is saved, and fill any field that is left empty.
//
// Server components read it with getSiteContent(); client components with useSection(id)
// from @/context/ContentContext (the root layout provides it).
export const CONTENT_TAG = 'content'

// 'alt' = alt text for the image in field `image` (same section/list item) or a fixed `src`
export type FieldType = 'text' | 'textarea' | 'image' | 'link' | 'alt'

export type FieldDef = {
  key: string
  label: string
  type: FieldType
  hint?: string
  image?: string
  src?: string
  default: string
}

export type ListFieldDef = Omit<FieldDef, 'default'>

export type ListDef = {
  label: string
  itemLabel: string
  max: number
  fields: ListFieldDef[]
  default: Record<string, string>[]
}

// Pages in the studio, in menu order. seoPath links a page to its SEO settings in seo_pages.
export const STUDIO_PAGES = [
  { slug: 'home', name: 'Home', href: '/', seoPath: '/' },
  { slug: 'menu', name: 'Menu', href: '/menu', seoPath: '/menu' },
  { slug: 'events', name: 'Events', href: '/events', seoPath: '/events' },
  { slug: 'offers', name: 'Offers', href: '/offer', seoPath: '/offer' },
  { slug: 'your-fish', name: 'Your Fish', href: '/your-fish', seoPath: '/your-fish' },
  { slug: 'links', name: 'Links (QR page)', href: '/links', seoPath: '/links' },
  { slug: 'menu-book', name: 'Menu Book', href: '/seafood-menu-book', seoPath: '/seafood-menu-book' },
  { slug: 'site', name: 'Header & Footer', href: '/', seoPath: null },
] as const

export type StudioPageSlug = (typeof STUDIO_PAGES)[number]['slug']

export type SectionDef = {
  id: string
  page: StudioPageSlug
  label: string
  fields: FieldDef[]
  list?: ListDef
}

export type SectionData = {
  fields: Record<string, string>
  items: Record<string, string>[]
}

// ---------- Field helpers ----------

const text = (key: string, label: string, value: string, hint?: string): FieldDef => ({ key, label, type: 'text', default: value, hint })
const area = (key: string, label: string, value: string, hint?: string): FieldDef => ({ key, label, type: 'textarea', default: value, hint })
const link = (key: string, label: string, value: string): FieldDef => ({
  key,
  label,
  type: 'link',
  default: value,
  hint: 'A page like /menu or a full https:// link.',
})
const eyebrow = (value: string): FieldDef => text('eyebrow', 'Small label above heading', value)
const body = (value: string, label = 'Paragraph'): FieldDef => area('body', label, value)

// Headings are "Heading" + "Highlighted words" (shown in italic colour after it).
// A new line in the heading becomes a line break on the site.
const heading = (title: string, highlight: string): FieldDef[] => [
  area('title', 'Heading', title, 'Press Enter for a new line. End with a new line to put the highlighted words on their own line.'),
  text('highlight', 'Highlighted words', highlight, 'Shown in italic colour after the heading.'),
]

const NAME_HINT = 'Read by Google and screen readers, and shown as a tooltip on hover.'
const ALT_HINT ='Describe the photo for Google and screen readers, e.g. "Grilled hammour with lemon at Boat Seafood Dubai".'

// An image field plus its alt text. `key` lets one section have several images.
const image = (src: string, alt: string, label = 'Image', key = 'image'): FieldDef[] => [
  { key, label, type: 'image', default: src },
  { key: `${key}_alt`, label: `${label} – alt text`, type: 'alt', image: key, hint: ALT_HINT, default: alt },
]
// Alt text for an image that is not editable here (logo, icons)
const fixedAlt = (key: string, label: string, src: string, alt: string): FieldDef => ({
  key,
  label,
  type: 'alt',
  src,
  hint: ALT_HINT,
  default: alt,
})

const listImage: ListFieldDef[] = [
  { key: 'image', label: 'Photo', type: 'image' },
  { key: 'alt', label: 'Photo alt text', type: 'alt', image: 'image', hint: 'Leave empty to use the title.' },
]

const pexels = (id: string, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&q=80&fm=webp`
const SOUP_BOWL =
  'https://images.pexels.com/photos/20814983/pexels-photo-20814983/free-photo-of-steaming-seafood-bowl.jpeg?auto=compress&cs=tinysrgb&w=800&q=80&fm=webp'
const WHATSAPP = 'https://wa.me/971507487220'
const WHATSAPP_OWN_FISH = 'https://wa.me/971507487220?text=Hello%2C%20I%20want%20to%20bring%20my%20own%20fish%20for%20preparation'
const FISH = cdn('/images/your-fish')

export const CONTENT_SECTIONS = [
  // ================= Header & Footer (every page) =================
  {
    id: 'navbar',
    page: 'site',
    label: 'Header / menu bar',
    fields: [
      text('phone', 'Top bar – phone', '+971 4 324 7998'),
      link('phone_link', 'Top bar – phone link', 'tel:+97143247998'),
      text('address', 'Top bar – address', 'Waterfront Market, Deira, Dubai'),
      text('hours', 'Top bar – hours', 'Open Daily: 12:00 PM - 12:00 AM'),
      text('nav_menu', 'Link – Menu', 'Menu'),
      text('nav_book', 'Link – Flipbook', 'Flipbook'),
      text('nav_experience', 'Link – Experience', 'Experience'),
      text('nav_location', 'Link – Location', 'Location'),
      text('nav_events', 'Link – Events', 'Events'),
      text('nav_offer', 'Link – Offer', 'Offer'),
      text('nav_fresh', 'Link – Fresh Catch', 'Fresh Catch'),
      text('delivery', 'Delivery button', 'Delivery'),
      text('order', 'Order button', 'Order Online'),
      fixedAlt('logo_alt', 'Logo – alt text', cdn('/logo.webp'), 'Boat Seafood Logo'),
      fixedAlt('delivery_alt', 'Delivery icon – alt text', cdn('/images-removebg-preview.webp'), 'Delivery'),
    ],
  },
  {
    id: 'floating',
    page: 'site',
    label: 'Floating buttons (bottom right)',
    fields: [
      text('menu_label', 'Menu button – name', 'View our seafood menu', NAME_HINT),
      fixedAlt('menu_alt', 'Menu button icon – alt text', cdn('/MenuIcon-02.webp'), 'Boat Seafood menu'),
      text('home_label', 'Home button – name (shown on the menu page)', 'Back to home', NAME_HINT),
      text('whatsapp_label', 'WhatsApp button – name', 'Chat with Boat Seafood on WhatsApp', NAME_HINT),
      link('whatsapp_link', 'WhatsApp link', 'https://wa.me/971507487220'),
      text('top_label', 'Back-to-top button – name', 'Back to top', NAME_HINT),
    ],
  },
  {
    id: 'ticker',
    page: 'site',
    label: 'Scrolling text strip (Home, under the top section)',
    fields: [],
    list: {
      label: 'Messages',
      itemLabel: 'Message',
      max: 12,
      fields: [{ key: 'text', label: 'Text', type: 'text' }],
      default: [
        'Fresh Daily Catch',
        'Waterfront Market · Dubai',
        'Open 12 PM — 11 PM Daily',
        'Premium Seafood Since 2021',
        'Private Events Available',
        'Expertly Prepared · Honestly Served',
      ].map((t) => ({ text: t })),
    },
  },
  {
    id: 'footer',
    page: 'site',
    label: 'Footer',
    fields: [
      fixedAlt('logo_alt', 'Logo – alt text', cdn('/logo.webp'), 'Boat Seafood'),
      area('about', 'About text', "Premium seafood dining at the heart of Dubai's Waterfront Market. Where the ocean meets the city. Freshness, quality, and an unforgettable atmosphere."),
      text('col_navigate', 'Column heading 1', 'Navigate'),
      text('link_menu', 'Link – The Menu', 'The Menu'),
      text('link_offers', 'Link – Special Offers', 'Special Offers'),
      text('link_events', 'Link – Events', 'Events'),
      text('link_experience', 'Link – Experience', 'Experience'),
      text('link_location', 'Link – Location', 'Location'),
      text('link_qr', 'Link – QR Links', 'QR Links'),
      text('col_dining', 'Column heading 2', 'Dining'),
      text('link_review', 'Link – Review Us', 'Review Us'),
      link('review_url', 'Review Us link', 'https://share.google/6sDV8BO7ZwyKB4VK0'),
      text('link_fresh', 'Link – Fresh Catch', 'Fresh Catch'),
      text('col_contact', 'Column heading 3', 'Contact'),
      text('label_phone', 'Phone label', 'Phone'),
      text('phone', 'Phone', '+971 4 324 7998'),
      link('phone_link', 'Phone link', 'tel:+97143247998'),
      text('label_email', 'Email label', 'Email'),
      text('email', 'Email', 'boatdxb26@gmail.com'),
      text('label_address', 'Address label', 'Address'),
      text('address', 'Address', 'Waterfront Market, Dubai'),
      text('label_hours', 'Hours label', 'Hours'),
      text('hours', 'Hours', 'Open 12 PM – 11 PM'),
      text('copyright', 'Copyright line', '© 2026 Boat Seafood, Dubai. All rights reserved.'),
      text('bottom_right', 'Bottom right text', 'Waterfront Market · Deira, UAE'),
    ],
  },

  // ================= Home =================
  {
    id: 'hero',
    page: 'home',
    label: 'Top section (video)',
    fields: [
      eyebrow('Est. 2021 · Waterfront Market · Dubai, UAE'),
      ...heading('Where the\nOcean Meets', 'the City.'),
      body("Seafood is not just food — it is an experience, a story, and a connection to the sea. Crafted daily at Dubai's finest waterfront.", 'Sub text'),
      text('cta', 'Main button', 'Order Online'),
      text('cta2', 'Second button', 'Find Us'),
      ...image(cdn('/images/custom/hero_waterfront_dubai_1777327086914.webp'), 'Boat Seafood restaurant at Waterfront Market, Dubai', 'Background image (shown before the video loads)'),
    ],
  },
  {
    id: 'origin',
    page: 'home',
    label: 'Our Origin',
    fields: [
      eyebrow('Our Origin'),
      ...heading('A Story Written\nby the', 'Sea'),
      body('Born at the heart of Waterfront Market, Boat Seafood stands where the ocean meets the city, and where every catch has a journey. We are committed to serving only the freshest selections — carefully chosen, expertly prepared, and honestly presented. Because quality is not a promise. It is our standard.'),
      text('cta', 'Button', 'Our Experience'),
      ...image(pexels('1267320', 1260), 'Fresh seafood platter at Boat Seafood Dubai'),
    ],
  },
  {
    id: 'stats',
    page: 'home',
    label: 'Numbers bar',
    fields: [],
    list: {
      label: 'Numbers',
      itemLabel: 'Number',
      max: 8,
      fields: [
        { key: 'value', label: 'Number', type: 'text' },
        { key: 'symbol', label: 'Symbol (+, %, st)', type: 'text' },
        { key: 'label', label: 'Label', type: 'text' },
      ],
      default: [
        { value: '4', symbol: '+', label: 'Years of Excellence' },
        { value: '50', symbol: '+', label: 'Signature Dishes' },
        { value: '100', symbol: '%', label: 'Daily Fresh Sourcing' },
        { value: '1', symbol: 'st', label: 'Premium Seafood at Waterfront' },
      ],
    },
  },
  {
    id: 'daily_catch',
    page: 'home',
    label: "Today's Catch",
    fields: [
      eyebrow('Fresh From the Market'),
      ...heading("Today's", 'Catch'),
      body('Our selection changes every morning based on what the ocean provides. Hand-picked at the Waterfront Market at dawn.'),
      text('cta', 'Link text', 'View Market Menu'),
    ],
  },
  {
    id: 'manifesto',
    page: 'home',
    label: 'Brand Manifesto (quote)',
    fields: [
      eyebrow('Brand Manifesto'),
      area('title', 'Quote', 'Seafood is not just food — it is an experience, a story, and a'),
      text('highlight', 'Highlighted end of quote', 'connection to the sea.'),
      text('cite', 'Quote by', '— Boat Seafood, Dubai'),
      ...image(cdn('/images/custom/menu_seafood_tower_platter_1777327161161.webp'), 'Seafood tower platter with lobster, prawns and oysters'),
    ],
  },
  {
    id: 'menu_showcase',
    page: 'home',
    label: 'Dish photo grid',
    fields: [
      text('title', 'Section heading (hidden – read by Google and screen readers)', 'Signature Seafood Dishes'),
      text('cta', 'Button', 'View Full Menu'),
    ],
  },
  {
    id: 'experience',
    page: 'home',
    label: 'The Experience',
    fields: [
      eyebrow('The Experience'),
      ...heading('Premium — Not Just\nin What We', 'Serve'),
      body('Every detail is considered long before a dish reaches your table — from the sourcing of the catch to the moment your plate arrives. Calm, unhurried, and deeply satisfying.'),
      text('cta', 'Button', 'Get Directions'),
      ...image(cdn('/images/custom/experience_plating_chef_1777327114148.webp'), 'Chef plating a seafood dish at Boat Seafood'),
      ...image(cdn('/images/custom/menu_gourmet_spices_saffron_1777327205314.webp'), 'Saffron and spices used in the Boat Seafood kitchen', 'Small photo 1', 'image2'),
      ...image(cdn('/images/custom/menu_tiger_prawns_grilled_1777327142301.webp'), 'Grilled tiger prawns', 'Small photo 2', 'image3'),
    ],
    list: {
      label: 'Feature boxes',
      itemLabel: 'Feature',
      max: 4,
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
      default: [
        { title: 'Waterfront Setting', description: "Dine at the water's edge where city skyline meets open sea." },
        { title: 'Daily Fresh Catch', description: 'Every selection arrives each morning directly from the market.' },
        { title: 'Private Events', description: 'Exclusive dining for up to 80 guests — crafted to order.' },
        { title: 'Curated Seasonal Menu', description: 'Chef-selected dishes that change with the tide and season.' },
      ],
    },
  },
  {
    id: 'gallery',
    page: 'home',
    label: 'Photo strip',
    fields: [],
    list: {
      label: 'Photos',
      itemLabel: 'Photo',
      max: 12,
      fields: listImage,
      default: [
        { image: SOUP_BOWL, alt: 'Steaming seafood bowl' },
        { image: pexels('10368144'), alt: 'Seafood dinner at Boat Seafood' },
        { image: pexels('262978'), alt: 'Restaurant dining table' },
        { image: pexels('331107'), alt: 'Grilled seafood platter' },
        { image: pexels('1267320'), alt: 'Fresh seafood dish' },
        { image: pexels('1683545'), alt: 'Guests dining at the restaurant' },
      ],
    },
  },
  {
    id: 'testimonials',
    page: 'home',
    label: 'Guest reviews',
    fields: [eyebrow('Guest Experiences'), ...heading('Loved by Connoisseurs,\n', 'Cherished by Locals.')],
    list: {
      label: 'Reviews',
      itemLabel: 'Review',
      max: 9,
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'content', label: 'Review', type: 'textarea' },
      ],
      default: [
        { name: 'James Harrington', role: 'Food Critic', content: 'The freshest seafood in Dubai, period. The Mediterranean Sea Bass was perfectly roasted, preserving the delicate flavors of the ocean.' },
        { name: 'Sarah Al-Maktoum', role: 'Regular Guest', content: 'Boat Seafood has become our weekly tradition. The atmosphere at the Waterfront Market combined with five-star service is unmatched.' },
        { name: 'Marcus Vane', role: 'International Traveler', content: 'An authentic culinary journey. You can taste the freshness in every bite. The signature platter is a masterpiece of textures and tastes.' },
      ],
    },
  },
  {
    id: 'visit',
    page: 'home',
    label: 'Come Dine With Us',
    fields: [
      text('badge', 'Badge', 'Walk-ins Welcome · Open Now'),
      eyebrow('Waterfront Market · Dubai'),
      ...heading('Come Dine\n', 'With Us'),
      text('hours_label', 'Hours label', 'Opening Hours'),
      text('hours', 'Opening hours', 'Every day · 12:00 PM – 11:00 PM'),
      text('address_label', 'Address label', 'Find Us'),
      text('address', 'Address', 'Waterfront Market, Deira, Dubai'),
      text('seating_label', 'Seating label', 'Seating Policy'),
      text('seating', 'Seating policy', 'Walk-ins welcome — no reservation needed'),
      text('cta', 'WhatsApp button', 'WhatsApp'),
      text('cta2', 'Directions button', 'Get Directions'),
      ...image(cdn('/images/custom/sensory_table_ambience_1777327223551.webp'), 'Boat Seafood restaurant dining room'),
    ],
  },
  {
    id: 'location',
    page: 'home',
    label: 'Find Us (map)',
    fields: [
      eyebrow('Find Us'),
      ...heading('At the Heart of\nWaterfront', 'Market'),
      text('address_label', 'Address label', 'Address'),
      area('address', 'Address', 'Waterfront Market, Al Khaleej Rd\nDeira, Dubai, UAE'),
      text('hours_label', 'Hours label', 'Hours'),
      text('hours', 'Hours', 'Monday – Sunday · 12:00 PM — 11:00 PM'),
      text('phone_label', 'Phone label', 'Contact'),
      text('phone', 'Phone', '+971 4 324 7998'),
      text('cta', 'Button', 'Get Directions'),
      text('map_label', 'Map label', 'Location'),
      text('map_text', 'Map text', 'Waterfront Market · Deira, Dubai'),
    ],
  },

  // ================= Menu =================
  {
    id: 'menu_hero',
    page: 'menu',
    label: 'Top section',
    fields: [
      text('back', 'Back link', 'Back to Home'),
      text('title', 'Heading', 'Menu'),
      area('body', 'Text (delivery / online visitors)', 'Explore our premium seafood selection for home delivery. Caught daily, delivered with care across Dubai.'),
      area('body_table', 'Text (guests ordering at a table via QR)', 'Enjoy our curated restaurant selection, prepared fresh and served directly to your table at the Waterfront Market.'),
      ...image(cdn('/images/custom/hero_waterfront_dubai_1777327086914.webp'), 'Boat Seafood restaurant at Waterfront Market, Dubai', 'Background image'),
    ],
  },

  // ================= Events =================
  {
    id: 'events_hero',
    page: 'events',
    label: 'Top section',
    fields: [
      eyebrow('Events & Gatherings'),
      ...heading('Unforgettable', 'Moments'),
      body('From intimate private dinners to festive celebrations, Boat Seafood provides the perfect waterfront backdrop for your special occasions.'),
      ...image(pexels('331107', 1260), 'Private event at Boat Seafood Dubai', 'Background image'),
    ],
  },
  {
    id: 'events_list',
    page: 'events',
    label: 'Special Events',
    fields: [eyebrow('Upcoming'), text('title', 'Heading', 'Special Events'), text('cta', 'Card link text', 'Inquire Now'), link('cta_link', 'Card link', WHATSAPP)],
    list: {
      label: 'Events',
      itemLabel: 'Event',
      max: 12,
      fields: [
        { key: 'title', label: 'Event name', type: 'text' },
        { key: 'date', label: 'Date / time', type: 'text' },
        { key: 'tag', label: 'Badge', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        ...listImage,
      ],
      default: [
        { title: 'Friday Lobster Night', date: 'Every Friday · 7:00 PM', tag: 'Weekly Special', description: 'Indulge in our signature butter-poached lobster, served with seasonal sides and premium pairings.', image: pexels('11054363', 1260), alt: '' },
        { title: "Monthly Chef's Table", date: 'Last Saturday of the Month', tag: 'Exclusive', description: "An exclusive 7-course tasting journey through the ocean's rarest treasures, guided by our Head Chef.", image: pexels('1267320'), alt: '' },
        { title: 'Seafood Festival 2024', date: 'Coming Soon · Nov 15-20', tag: 'Festival', description: "A celebration of coastal flavors featuring live music, outdoor grilling, and the city's largest seafood platter.", image: SOUP_BOWL, alt: '' },
      ],
    },
  },
  {
    id: 'events_gallery',
    page: 'events',
    label: 'Event Galleries',
    fields: [
      eyebrow('Past Memories'),
      ...heading('Event', 'Galleries'),
      body("A glimpse into the celebrations and experiences we've hosted at Boat Seafood."),
      text('cta', 'Button', 'Book Your Event'),
      link('cta_link', 'Button link', WHATSAPP),
    ],
    list: {
      label: 'Galleries',
      itemLabel: 'Gallery',
      max: 12,
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'count', label: 'Photo count label', type: 'text' },
        ...listImage,
      ],
      default: [
        { title: 'Grand Opening Gala', count: '24 Photos', image: pexels('1683545'), alt: '' },
        { title: 'Corporate Seafood Dinner', count: '18 Photos', image: pexels('262978'), alt: '' },
        { title: 'Private Yacht Catering', count: '12 Photos', image: pexels('331107'), alt: '' },
        { title: 'Birthday Celebration', count: '32 Photos', image: pexels('10368144'), alt: '' },
      ],
    },
  },

  // ================= Offers =================
  {
    id: 'offers_hero',
    page: 'offers',
    label: 'Top section',
    fields: [
      eyebrow('Exclusive Rewards'),
      ...heading('Taste the', 'Savings'),
      body('Explore our range of seasonal promotions and daily specials designed to make your dining experience at Boat Seafood even more memorable.'),
      ...image(pexels('1267320', 1260), 'Seafood offers at Boat Seafood Dubai', 'Background image'),
    ],
  },
  {
    id: 'offers_list',
    page: 'offers',
    label: 'Special Promotions',
    fields: [eyebrow('Limited Time'), text('title', 'Heading', 'Special Promotions')],
    list: {
      label: 'Offers',
      itemLabel: 'Offer',
      max: 12,
      fields: [
        { key: 'title', label: 'Offer name', type: 'text' },
        { key: 'subtitle', label: 'Sub title', type: 'text' },
        { key: 'tag', label: 'Badge (e.g. time)', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        ...listImage,
        { key: 'cta', label: 'Button text', type: 'text' },
        { key: 'link', label: 'Button link', type: 'link', hint: 'A page like /menu or a full https:// link.' },
      ],
      default: [
        { title: 'Lunch Delight Menu', subtitle: 'Weekdays Special', tag: '12 PM - 4 PM', description: 'Enjoy a curated 3-course seafood lunch featuring our daily catch, starting from AED 89. Perfect for business meetings or casual breaks.', image: pexels('2098085'), alt: '', cta: 'View Lunch Menu', link: '/menu' },
        { title: 'Family Seafood Feast', subtitle: 'Weekend Tradition', tag: 'Weekend Only', description: 'Our signature jumbo platter featuring grilled prawns, calamari, mussels, and our catch of the day. Serves 4-6 people with side dishes.', image: pexels('331107'), alt: '', cta: 'Book a Table', link: WHATSAPP },
        { title: 'Sunset Happy Hour', subtitle: 'Daily Refreshment', tag: '5 PM - 8 PM', description: 'Buy one get one free on all signature mocktails and 20% off on appetizers while you watch the sunset over the waterfront.', image: pexels('11054363'), alt: '', cta: 'Learn More', link: WHATSAPP },
      ],
    },
  },
  {
    id: 'offers_perks',
    page: 'offers',
    label: 'Diner Benefits',
    fields: [
      eyebrow('Complimentary'),
      text('title', 'Heading', 'Diner Benefits'),
      body('Every visit to Boat Seafood comes with special perks for our regular guests. Show your market shopping receipt or join our loyalty circle.'),
      text('cta', 'Button', 'Join Member Circle'),
      link('cta_link', 'Button link', WHATSAPP),
    ],
    list: {
      label: 'Benefits',
      itemLabel: 'Benefit',
      max: 6,
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ],
      default: [
        { title: 'Birthday Treat', description: 'Complimentary dessert and a special birthday surprise when you celebrate your big day with us.' },
        { title: 'Market Discount', description: 'Show your Waterfront Market shopping receipt to get 10% off on your total bill.' },
        { title: 'Priority Booking', description: 'Skip the queue with priority table assignments during weekends and busy festival seasons.' },
      ],
    },
  },

  // ================= Your Fish =================
  {
    id: 'fish_hero',
    page: 'your-fish',
    label: 'Top section',
    fields: [
      eyebrow('Your Fish, We Prepare'),
      ...heading('At Boat Seafood, your catch becomes your', 'perfect meal.'),
      body('Bring your fresh fish directly from the market or the sea, and our chefs will prepare it exactly the way you love it — full of authentic flavor, fresh ingredients, and coastal tradition.'),
      text('cta', 'Main button', 'Book a Table'),
      link('cta_link', 'Main button link', WHATSAPP_OWN_FISH),
      text('cta2', 'Second button', 'View Styles'),
      text('pill1', 'Badge 1', 'Fresh from the market'),
      text('pill2', 'Badge 2', 'Prepared to your taste'),
      text('pill3', 'Badge 3', 'Family-friendly dining'),
      text('badge', 'Floating badge text', 'Fresh Catch + Expert Preparation'),
      ...image(`${FISH}/02-hero-grilled-fish-closeup.webp`, 'Perfectly grilled fish — Boat Seafood'),
    ],
  },
  {
    id: 'fish_steps',
    page: 'your-fish',
    label: 'How It Works',
    fields: [eyebrow('Simple & Transparent'), text('title', 'Heading', 'How It Works'), body('From fresh catch to perfect plate in 3 simple steps.')],
    list: {
      label: 'Steps',
      itemLabel: 'Step',
      max: 6,
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        ...listImage,
      ],
      default: [
        { title: 'Choose Fresh From the Market', description: 'Pick your fish straight from the market or bring your own catch.', image: `${FISH}/01-choose-fresh-fish-at-market.webp`, alt: '' },
        { title: 'We Prepare It Your Way', description: 'Our chefs cook it exactly the way you like, using fresh ingredients and bold flavor.', image: `${FISH}/02-hero-grilled-fish-closeup.webp`, alt: '' },
        { title: 'Enjoy the Experience', description: 'Dine with family and friends in a warm coastal setting by the sea.', image: `${FISH}/03-family-seaside-dining-experience.webp`, alt: '' },
      ],
    },
  },
  {
    id: 'fish_styles',
    page: 'your-fish',
    label: 'Preparation Styles',
    fields: [
      eyebrow('Choose Your Favorite Style'),
      text('title', 'Heading', 'Prepared Just The Way You Love It'),
      body('Explore some of the ways our chefs can prepare your fish — each method crafted to bring out the best in every catch.'),
      text('cta', 'Button', 'And Much More'),
    ],
    list: {
      label: 'Styles',
      itemLabel: 'Style',
      max: 12,
      fields: [
        { key: 'title', label: 'Name', type: 'text' },
        { key: 'description', label: 'Caption', type: 'text' },
        ...listImage,
      ],
      default: [
        { title: 'Fried', description: 'Crispy, golden, and full of flavor.', image: `${FISH}/04-style-fried-fish.webp`, alt: '' },
        { title: 'Grilled', description: 'Smoky, tender, and perfectly charred.', image: `${FISH}/05-style-grilled-fish.webp`, alt: '' },
        { title: 'Tawa', description: 'Rich spices seared on a hot flat pan.', image: `${FISH}/06-style-tawa-fish.webp`, alt: '' },
        { title: 'Oven Baked', description: 'Delicate, aromatic, and herb infused.', image: `${FISH}/07-style-oven-baked-fish.webp`, alt: '' },
        { title: 'Curry & Gravy', description: 'Comforting coastal flavors in every bite.', image: `${FISH}/08-style-curry-and-gravy-fish.webp`, alt: '' },
        { title: 'Seafood Soup', description: 'Warm, hearty, and deeply satisfying.', image: `${FISH}/09-style-seafood-soup.webp`, alt: '' },
        { title: 'Tagine', description: 'Slow-cooked with rich spices and tradition.', image: `${FISH}/10-style-seafood-tagine.webp`, alt: '' },
        { title: 'Fresh Salads', description: 'Light, crisp, and refreshing on the side.', image: `${FISH}/11-style-fresh-salad.webp`, alt: '' },
      ],
    },
  },
  {
    id: 'fish_story',
    page: 'your-fish',
    label: 'The Boat Experience',
    fields: [
      eyebrow('The Boat Experience'),
      ...heading('From Catch to Table,', 'Always Fresh. Always Yours.'),
      body("Whether it's a family catch, a special seafood selection, or your favorite local fish, we turn freshness into a memorable dining experience."),
      text('feature1', 'Point 1', 'Fresh Ingredients'),
      text('feature2', 'Point 2', 'Expert Preparation'),
      text('feature3', 'Point 3', 'Coastal Tradition'),
      text('closing', 'Closing line', 'Your Fish. Your Taste.'),
      text('closing_highlight', 'Closing line – highlighted', 'Expertly Prepared.'),
      text('badge_label', 'Photo badge – label', 'Boat Seafood · Dubai'),
      text('badge_quote', 'Photo badge – quote', 'Your Fish. Your Taste. Expertly Prepared.'),
      ...image(`${FISH}/03-family-seaside-dining-experience.webp`, 'Family dining experience at Boat Seafood Restaurant'),
    ],
  },
  {
    id: 'fish_cta',
    page: 'your-fish',
    label: 'Bottom call to action',
    fields: [
      eyebrow('Ready to Dive In?'),
      text('title', 'Heading', 'Ready to turn your fresh catch into the perfect meal?'),
      body('Bring your fish, choose your style, and let our chefs do the rest.'),
      text('cta', 'Main button', 'Book a Table'),
      link('cta_link', 'Main button link', WHATSAPP_OWN_FISH),
      text('cta2', 'Second button', 'Contact Us'),
      link('cta2_link', 'Second button link', WHATSAPP),
      text('note', 'Small note', 'Perfect for family meals, special catches, and seafood lovers.'),
    ],
  },

  // ================= Menu Book (/seafood-menu-book) =================
  // Dish pages are built from the menu in Admin → Menu; these are the fixed pages around them.
  {
    id: 'book_intro',
    page: 'menu-book',
    label: 'Top of page (above the book)',
    fields: [
      eyebrow('Boat Seafood · Menu Book'),
      ...heading('Our Seafood', 'Menu Book'),
      body('Turn the pages of our menu — fresh catch, signature platters and coastal classics, cooked daily at Waterfront Market, Dubai.'),
      text('hint', 'Help text under the book', 'Drag a page corner, swipe, or use the arrows to turn the pages.'),
    ],
  },
  {
    id: 'book_cover',
    page: 'menu-book',
    label: 'Front cover',
    fields: [
      text('title', 'Cover title', 'Boat Seafood'),
      text('subtitle', 'Cover subtitle', 'The Menu'),
      text('tagline', 'Cover tagline', 'Waterfront Market · Dubai'),
      fixedAlt('logo_alt', 'Logo – alt text', cdn('/logo.webp'), 'Boat Seafood Restaurant logo'),
      ...image(cdn('/images/custom/hero_waterfront_dubai_1777327086914.webp'), 'Boat Seafood restaurant at Waterfront Market, Dubai', 'Cover photo'),
    ],
  },
  {
    id: 'book_story',
    page: 'menu-book',
    label: 'Our Story page + Contents page',
    fields: [
      eyebrow('Our Story'),
      text('title', 'Story heading', 'Fresh from the market, cooked with care'),
      body('Born at the heart of Waterfront Market, Boat Seafood serves only the freshest catch — chosen at dawn, prepared by our chefs and honestly presented. Pick from our menu, or bring your own fish from the market and we will cook it your way.'),
      ...image(cdn('/images/custom/experience_plating_chef_1777327114148.webp'), 'Chef plating a seafood dish at Boat Seafood'),
      text('contents_title', 'Contents page heading', 'Contents'),
    ],
  },
  {
    id: 'book_back',
    page: 'menu-book',
    label: 'Back cover',
    fields: [
      text('title', 'Heading', 'Visit Us'),
      area('address', 'Address', 'Waterfront Market, Al Khaleej Rd\nDeira, Dubai, UAE'),
      text('hours', 'Hours', 'Every day · 12:00 PM – 11:00 PM'),
      text('phone', 'Phone', '+971 4 324 7998'),
      text('cta', 'Button text', 'Order Online'),
      link('cta_link', 'Button link', '/menu'),
      text('closing', 'Closing line', 'Thank you for dining with us'),
    ],
  },

  // ================= Links (QR page) =================
  {
    id: 'links_page',
    page: 'links',
    label: 'Links page',
    fields: [
      text('title', 'Page heading (hidden – read by Google and screen readers)', 'Boat Seafood Restaurant Dubai – Menu, Reviews & Links'),
      fixedAlt('logo_alt', 'Logo – alt text', cdn('/logo.webp'), 'Boat Seafood Restaurant'),
      text('tagline', 'Tagline', 'Seafood Restaurant'),
      text('location', 'Location', 'Dubai · Waterfront Market'),
      text('btn_menu', 'Button – View Menu', 'View Menu'),
      text('btn_offers', 'Button – Special Offers', 'Special Offers'),
      text('btn_review', 'Button – Review Us', 'Review Us'),
      link('review_url', 'Review Us link', 'https://share.google/6sDV8BO7ZwyKB4VK0'),
      text('btn_visit', 'Button – Visit Us', 'Visit Us'),
      link('visit_url', 'Visit Us link (Google Maps)', 'https://share.google/m3vxo1gRP57YEAX5S'),
      text('btn_events', 'Button – Events', 'Events'),
      text('btn_contact', 'Button – Save Contact', 'Save Contact'),
      text('btn_fresh', 'Button – Fresh Catch', 'Fresh Catch'),
      text('btn_share', 'Button – Share', 'Share'),
      text('share_text', 'Text used when sharing', 'Welcome to Boat Seafood Restaurant. View our menu, leave a review, or follow us on social media.'),
      text('footer', 'Bottom text', 'Boat Seafood · Dubai'),
    ],
  },
] as const satisfies readonly SectionDef[]

export type SectionId = (typeof CONTENT_SECTIONS)[number]['id']
export type SiteContent = Record<SectionId, SectionData>

export const ALL_SECTIONS = CONTENT_SECTIONS as readonly SectionDef[]

export function getSectionDef(id: string): SectionDef | undefined {
  return ALL_SECTIONS.find((s) => s.id === id)
}

export function defaultSection(def: SectionDef): SectionData {
  return {
    fields: Object.fromEntries(def.fields.map((f) => [f.key, f.default])),
    items: def.list ? def.list.default.map((item) => ({ ...item })) : [],
  }
}

// Saved values over the defaults: empty fields fall back, a saved list replaces the default list
export function mergeSection(def: SectionDef, saved: Partial<SectionData> | null | undefined): SectionData {
  const base = defaultSection(def)
  if (!saved) return base
  for (const f of def.fields) {
    const v = saved.fields?.[f.key]
    if (typeof v === 'string' && v.trim()) base.fields[f.key] = v
  }
  if (def.list && Array.isArray(saved.items)) {
    base.items = saved.items.map((item) =>
      Object.fromEntries(def.list!.fields.map((f) => [f.key, typeof item?.[f.key] === 'string' ? item[f.key] : '']))
    )
  }
  return base
}

export function mergeAll(rows: { section: string; data: SectionData }[] | null | undefined): SiteContent {
  const saved = new Map((rows ?? []).map((row) => [row.section, row.data]))
  return Object.fromEntries(ALL_SECTIONS.map((def) => [def.id, mergeSection(def, saved.get(def.id))])) as SiteContent
}

