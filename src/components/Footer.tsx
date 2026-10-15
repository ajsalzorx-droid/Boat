import Link from "next/link";

export default function Footer() {


  return (
    <footer className="bg-[#001117] border-t border-white/5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] gap-14 py-24 px-8 md:px-20 border-b border-white/5">
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <Link href="/" className="block h-16 w-48">
            <img src="/logo.png" alt="Boat Seafood" className="h-full w-auto object-contain brightness-0 invert" />
          </Link>
          <p className="text-[15px] font-light text-white/50 leading-relaxed max-w-[300px]">
            Premium seafood dining at the heart of Dubai's Waterfront Market. Where the ocean meets the city. Freshness, quality, and an unforgettable atmosphere.
          </p>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/boat_seafood_/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 transition-all duration-300 hover:border-[#C49A3C] hover:text-[#C49A3C] hover:bg-white/5" title="Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
            </a>
            <a href="https://www.tiktok.com/@boatseafoodrestaurant" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 transition-all duration-300 hover:border-[#C49A3C] hover:text-[#C49A3C] hover:bg-white/5" title="TikTok">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12a4 4 0 104 4V4a5 5 0 005 5" /></svg>
            </a>
            <a href="https://www.facebook.com/boatseafoodrestaurant/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 transition-all duration-300 hover:border-[#C49A3C] hover:text-[#C49A3C] hover:bg-white/5" title="Facebook">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            </a>
          </div>
        </div>

        <div>
          <div className="text-[11px] tracking-[4px] uppercase text-[#C49A3C] mb-8 font-medium">Navigate</div>
          <ul className="flex flex-col gap-4 list-none p-0 m-0">
            <li><Link href="/menu" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">The Menu</Link></li>
            <li><Link href="/offer" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Special Offers</Link></li>
            <li><Link href="/events" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Events</Link></li>
            <li><Link href="/#exp" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Experience</Link></li>
            <li><Link href="/#loc" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Location</Link></li>
            <li>
              <Link href="/links" className="flex items-center gap-2 text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 group">
                <svg className="w-4 h-4 text-[#C49A3C]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M7 7h.01" /><path d="M17 7h.01" /><path d="M17 17h.01" /><path d="M7 17h.01" />
                </svg>
                QR Links
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] tracking-[4px] uppercase text-[#C49A3C] mb-8 font-medium">Dining</div>
          <ul className="flex flex-col gap-4 list-none p-0 m-0">
            <li><a href="https://share.google/6sDV8BO7ZwyKB4VK0" target="_blank" rel="noopener noreferrer" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Review Us</a></li>
            <li><Link href="/events" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Events</Link></li>
            <li><Link href="/#exp" className="text-[15px] font-light text-white/60 hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">Experience</Link></li>
            <li>
              <Link href="/your-fish" className="text-[15px] font-light text-[#C89B4B] hover:text-white hover:translate-x-1 transition-all duration-300 inline-block">
                Fresh Catch
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div className="text-[11px] tracking-[4px] uppercase text-[#C49A3C] mb-8 font-medium">Contact</div>
          <ul className="flex flex-col gap-5 list-none p-0 m-0">
            <li>
              <a href="tel:+97140000000" className="flex flex-col gap-1 group">
                <span className="text-[10px] uppercase tracking-[2px] text-white/30 group-hover:text-[#C49A3C] transition-colors">Phone</span>
                <span className="text-[15px] font-light text-white/70 group-hover:text-white transition-colors">+971 4 XXX XXXX</span>
              </a>
            </li>
            <li>
              <a href="mailto:hello@boatseafood.ae" className="flex flex-col gap-1 group">
                <span className="text-[10px] uppercase tracking-[2px] text-white/30 group-hover:text-[#C49A3C] transition-colors">Email</span>
                <span className="text-[15px] font-light text-white/70 group-hover:text-white transition-colors">hello@boatseafood.ae</span>
              </a>
            </li>
            <li>
              <Link href="/#loc" className="flex flex-col gap-1 group">
                <span className="text-[10px] uppercase tracking-[2px] text-white/30 group-hover:text-[#C49A3C] transition-colors">Address</span>
                <span className="text-[15px] font-light text-white/70 group-hover:text-white transition-colors">Waterfront Market, Dubai</span>
              </Link>
            </li>
            <li className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[2px] text-white/30">Hours</span>
              <span className="text-[15px] font-light text-white/70">Open 12 PM – 11 PM</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-8 px-8 md:px-20 text-[12px] font-light text-white/20 tracking-[1px] uppercase">
        <p className="m-0">&copy; 2026 Boat Seafood, Dubai. All rights reserved.</p>
        <p className="m-0">Waterfront Market · Deira, UAE</p>
      </div>
    </footer>
  );
}
