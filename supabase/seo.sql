-- Boat Seafood: SEO Studio tables (/seo): page titles, business info and page content
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run (keeps existing values).
--
-- Writes go through the admin Server Actions (token verified, service_role key), same as
-- menu_items / daily_catch, so there are only read policies here.

begin;

-- 1. Per-page title / description / share image
create table if not exists public.seo_pages (
  path        text primary key,              -- '/', '/menu', '/events', ...
  title       text not null default '',
  description text not null default '',
  og_image    text not null default '',      -- share image (WhatsApp, Facebook, X)
  noindex     boolean not null default false, -- true = hide this page from Google
  updated_at  timestamptz not null default now()
);

-- 2. Business details (one row) - used for Google's Restaurant info and share defaults
create table if not exists public.business_info (
  id            int primary key default 1 check (id = 1),
  name          text not null default 'Boat Seafood Restaurant',
  site_url      text not null default '',     -- e.g. https://boatseafood.ae
  phone         text not null default '',
  email         text not null default '',
  street        text not null default '',
  locality      text not null default '',
  region        text not null default '',
  postal_code   text not null default '',
  country       text not null default 'AE',
  latitude      text not null default '',
  longitude     text not null default '',
  opens         text not null default '12:00',
  closes        text not null default '23:00',
  price_range   text not null default '$$',
  cuisine       text not null default 'Seafood',
  instagram     text not null default '',
  facebook      text not null default '',
  tiktok        text not null default '',
  default_og_image text not null default '',
  updated_at    timestamptz not null default now()
);

-- 3. Starting values (only inserted if missing)
insert into public.seo_pages (path, title, description) values
  ('/',          'Boat Seafood Dubai | Seafood Restaurant, Waterfront Market',
                 'Premium seafood dining in Dubai’s Waterfront Market. Fresh daily catch, signature seafood dishes, private dining, and elegant waterfront experience.'),
  ('/menu',      'Seafood Menu | Boat Seafood Dubai',
                 'Explore the Boat Seafood menu: fresh fish, prawns, lobster, crab and signature dishes cooked daily at Waterfront Market, Deira, Dubai.'),
  ('/events',    'Events & Seafood Nights | Boat Seafood Dubai',
                 'Lobster nights, chef’s table dinners and private events at Boat Seafood, Waterfront Market, Dubai.'),
  ('/offer',     'Offers & Deals | Boat Seafood Dubai',
                 'Current seafood offers at Boat Seafood Dubai: lunch menus, family feasts and seasonal deals at Waterfront Market.'),
  ('/your-fish', 'Bring Your Own Fish – We Cook It | Boat Seafood Dubai',
                 'Buy fresh fish at Waterfront Market and our chefs will clean, cook and serve it your way. Grilled, fried or curry.'),
  ('/seafood-menu-book', 'Seafood Menu Book | Boat Seafood Dubai',
                 'Flip through the Boat Seafood menu book: fresh fish, prawns, lobster and sharing platters with prices, at Waterfront Market, Deira, Dubai.'),
  ('/links',     'Links | Boat Seafood Restaurant',
                 'Welcome to Boat Seafood Restaurant. View our menu, leave a review, or follow us on social media.')
on conflict (path) do nothing;

insert into public.business_info (id, site_url, phone, email, street, locality, region, latitude, longitude, instagram, facebook, tiktok)
values (1, 'https://boatseafood.ae', '', 'hello@boatseafood.ae', 'Waterfront Market, Al Khaleej Rd',
        'Deira', 'Dubai', '25.2759', '55.3202',
        'https://www.instagram.com/boat_seafood_/', 'https://www.facebook.com/boatseafoodrestaurant/',
        'https://www.tiktok.com/@boatseafoodrestaurant')
on conflict (id) do nothing;

-- 4. Read-only access (the public site needs to read these to build page titles)
alter table public.seo_pages     enable row level security;
alter table public.business_info enable row level security;

drop policy if exists "seo: public read" on public.seo_pages;
create policy "seo: public read" on public.seo_pages
  for select to anon, authenticated using (true);

drop policy if exists "business: public read" on public.business_info;
create policy "business: public read" on public.business_info
  for select to anon, authenticated using (true);

-- 5. Page text, images, alt text and lists. One row per section, e.g. 'hero',
--    'events_list'. Missing rows = the site shows its built-in default text.
create table if not exists public.site_content (
  section    text primary key,
  data       jsonb not null default '{}'::jsonb,  -- { "fields": {...}, "items": [...] }
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- 6. Publish state: saves set changed_at (draft), "Confirm & Publish" sets published_at and
--    clears the site cache. changed_at > published_at = saved changes not live yet.
create table if not exists public.site_publish (
  id           int primary key default 1 check (id = 1),
  changed_at   timestamptz,
  published_at timestamptz
);
insert into public.site_publish (id) values (1) on conflict (id) do nothing;

alter table public.site_publish enable row level security;

drop policy if exists "publish: staff read" on public.site_publish;
create policy "publish: staff read" on public.site_publish
  for select to authenticated using (true);

drop policy if exists "content: public read" on public.site_content;
create policy "content: public read" on public.site_content
  for select to anon, authenticated using (true);

commit;
