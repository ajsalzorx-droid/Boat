"use client";

import { motion } from "framer-motion";
import { ArrowRight, MapPin, Clock, Phone } from "lucide-react";

export default function Location() {
  return (
    <section className="bg-navy py-[108px] px-7 md:px-20 grid grid-cols-1 md:grid-cols-[1fr_1.25fr] gap-[90px] items-center" id="loc">
      <motion.div
        initial={{ opacity: 0, y: 38 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="inline-flex items-center gap-3.5 text-[9px] tracking-[5px] uppercase text-ocean-light font-normal mb-6.5">
          <span className="w-6.5 h-[1px] bg-ocean-light shrink-0"></span>
          Find Us
        </span>
        <h2 className="font-playfair font-normal leading-[1.07] text-white text-[clamp(30px,3.4vw,50px)] mb-9.5">
          At the Heart of<br />Waterfront <em className="italic text-ocean-light">Market</em>
        </h2>

        <div className="flex flex-col gap-6.5 mb-12">
          <div className="grid grid-cols-[18px_1fr] gap-4.5 items-start">
            <MapPin className="w-3.5 h-3.5 text-ocean mt-1" strokeWidth={1.5} />
            <div>
              <div className="text-[8px] tracking-[3px] uppercase text-ocean-light mb-1.5 font-normal">Address</div>
              <div className="text-[13px] font-light text-white/50 leading-[1.75]">
                Waterfront Market, Al Khaleej Rd<br />Deira, Dubai, UAE
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[18px_1fr] gap-4.5 items-start">
            <Clock className="w-3.5 h-3.5 text-ocean mt-1" strokeWidth={1.5} />
            <div>
              <div className="text-[8px] tracking-[3px] uppercase text-ocean-light mb-1.5 font-normal">Hours</div>
              <div className="text-[13px] font-light text-white/50 leading-[1.75]">
                Monday – Sunday · 12:00 PM — 11:00 PM
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[18px_1fr] gap-4.5 items-start">
            <Phone className="w-3.5 h-3.5 text-ocean mt-1" strokeWidth={1.5} />
            <div>
              <div className="text-[8px] tracking-[3px] uppercase text-ocean-light mb-1.5 font-normal">Contact</div>
              <div className="text-[13px] font-light text-white/50 leading-[1.75]">
                +971 4 XXX XXXX
              </div>
            </div>
          </div>
        </div>

        <a
          href="https://www.google.com/maps?vet=10CAAQoqAOahcKEwjYxrvuv5iUAxUAAAAAHQAAAAAQBQ..i&pvq=Cg0vZy8xMXcyZmRna2QyIlYKUEJPQVQgU0VBRk9PRCBSRVNUQVVSQU5UIC_Zhdi32LnZhSDYp9mE2YXYsdmD2Kgg2YTZhNmF2KLZg9mI2YTYp9iqINin2YTYqNit2LHZitipEAIYAw&lqi=ClBCT0FUIFNFQUZPT0QgUkVTVEFVUkFOVCAv2YXYt9i52YUg2KfZhNmF2LHZg9ioINmE2YTZhdii2YPZiNmE2KfYqiDYp9mE2KjYrdix2YrYqUiCi53WibuAgAhafRAAEAEQAhADEAQQBRAGGAAYARgCGAMYBBgFGAYiT2JvYXQgc2VhZm9vZCByZXN0YXVyYW50INmF2LfYudmFINin2YTZhdix2YPYqCDZhNmE2YXYotmD2YjZhNin2Kog2KfZhNio2K3YsdmK2KkqDggCEAAQARACEAQQBRAGkgESc2VhZm9vZF9yZXN0YXVyYW50mgFEQ2k5RFFVbFJRVU52WkVOb2RIbGpSamx2VDI1YWQxVkZiRXhqZW1oSFpETnNTV05XWkZaYVZGcHVZVEZzVDJSWVl4QUL6AQQIABBK&fvr=1&cs=0&um=1&ie=UTF-8&fb=1&gl=ae&sa=X&geocode=KQ2ydF9RW18-MWmWtPuHlIzY&daddr=Waterfront+-+Daira+-+Corniche+Deira+-+Deira+-+Dubai"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-3.5 border border-ocean-light/50 rounded-lg text-ocean-light py-[15px] px-10 font-jost max-md:whitespace-nowrap max-md:px-7 text-[10px] font-light tracking-[3px] uppercase no-underline transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ocean hover:text-navy hover:border-ocean"
        >
          Get Directions
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 38 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.95, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-[440px] overflow-hidden"
      >
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3608.5271864746657!2d55.32018097601042!3d25.275953977662556!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5ceff4f4b00f%3A0x4de3c1d3d3b8e3d3!2sWaterfront%20Market%2C%20Deira%2C%20Dubai!5e0!3m2!1sen!2sae!4v1714560000000!5m2!1sen!2sae"
          loading="lazy"
          allowFullScreen
          className="w-full h-full border-none invert-[0.9] hue-rotate-[198deg] saturate-30 brightness-[0.58]"
        ></iframe>
        <div className="absolute inset-0 border border-ocean-light/20 pointer-events-none"></div>
        <div className="absolute bottom-4.5 left-4.5 bg-ink/90 backdrop-blur-[10px] border border-ocean-light/20 py-3.5 px-5 text-white font-jost text-xs font-light">
          <strong className="text-ocean-light block text-[8px] tracking-[3px] uppercase mb-1 font-normal">
            Location
          </strong>
          Waterfront Market · Deira, Dubai
        </div>
      </motion.div>
    </section>
  );
}
