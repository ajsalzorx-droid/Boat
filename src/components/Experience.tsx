"use client";

import { motion } from "framer-motion";
import { ArrowRight, Anchor, Fish, Users, ChefHat } from "lucide-react";



const features = [
  {
    title: "Waterfront Setting",
    description: "Dine at the water's edge where city skyline meets open sea.",
    icon: Anchor,
  },
  {
    title: "Daily Fresh Catch",
    description: "Every selection arrives each morning directly from the market.",
    icon: Fish,
  },
  {
    title: "Private Events",
    description: "Exclusive dining for up to 80 guests — crafted to order.",
    icon: Users,
  },
  {
    title: "Curated Seasonal Menu",
    description: "Chef-selected dishes that change with the tide and season.",
    icon: ChefHat,
  },
];

export default function Experience() {
  return (
    <section className="bg-navy relative overflow-hidden" id="exp">
      <div className="absolute -top-[300px] -right-[300px] w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(102,155,188,0.06)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative min-h-[500px] lg:min-h-[700px] overflow-hidden">
          {/* Fallback Image */}
          <img src="/images/custom/experience_plating_chef_1777327114148.png" alt="Experience Background" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />

          <div className="absolute inset-0 bg-gradient-to-r from-navy/40 via-navy/60 to-navy lg:to-navy"></div>

          <div className="absolute bottom-12 -right-6 grid grid-rows-2 gap-1.5 w-[190px] hidden md:grid">
            <img src="/images/custom/menu_gourmet_spices_saffron_1777327205314.png" alt="Kitchen" loading="lazy" className="w-full h-[126px] object-cover border-[1.5px] border-ocean-light/20 transition-all group-hover:scale-105" />
            <img src="/images/custom/menu_tiger_prawns_grilled_1777327142301.png" alt="Dining" loading="lazy" className="w-full h-[126px] object-cover border-[1.5px] border-ocean-light/20 transition-all group-hover:scale-105" />
          </div>
        </div>

        <div className="py-24 px-12 lg:pr-22 lg:pl-14 flex flex-col justify-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 38 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-flex items-center gap-3.5 text-[10px] tracking-[5px] uppercase text-ocean font-bold mb-6.5">
              <span className="w-6.5 h-[1px] bg-ocean shrink-0"></span>
              The Experience
            </span>
            <h2 className="font-playfair font-bold leading-[1.07] text-white text-[clamp(32px,3.6vw,54px)] mb-6.5 drop-shadow-sm">
              Premium — Not Just<br />in What We <em className="italic text-ocean">Serve</em>
            </h2>
            <p className="text-[14px] leading-[2.1] text-white/70 font-medium max-w-[400px] mb-12.5">
              Every detail is considered long before a dish reaches your table — from the sourcing of the catch to the moment your plate arrives. Calm, unhurried, and deeply satisfying.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5 mb-12.5">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 38 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.95, delay: 0.1 * index, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-white/[0.025] border border-ocean-light/10 p-6.5 transition-all duration-400 hover:bg-ocean-light/5 hover:border-ocean-light/30 overflow-hidden"
              >
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-ocean scale-x-0 origin-left transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"></div>
                <feature.icon className="w-6.5 h-6.5 text-ocean mb-3.5" strokeWidth={1.3} />
                <div className="font-playfair text-[15px] font-normal text-white mb-2">
                  {feature.title}
                </div>
                <div className="text-[11px] text-white/35 leading-[1.9] font-light">
                  {feature.description}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 38 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.95, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <a
              href="#loc"
              className="group inline-flex items-center gap-3.5 border border-ocean-light/50 rounded-lg text-ocean-light py-[15px] px-10 font-jost max-md:whitespace-nowrap max-md:px-7 text-[10px] font-light tracking-[3px] uppercase no-underline transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-ocean hover:text-navy hover:border-ocean"
            >
              Get Directions
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1.5" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
