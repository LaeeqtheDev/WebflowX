"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { COMPARISONS, FEATURES, USE_CASES } from "@/lib/marketing-content";

const menuItems = [
  { label: "Merger", href: "#merger" },
  { label: "Journey", href: "#timeline" },
  { label: "Team", href: "#team" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const productGroups = [
  { title: "Features", base: "/features", items: FEATURES.map((p) => ({ href: `/features/${p.slug}`, label: p.name })) },
  { title: "Use cases", base: "/use-cases", items: USE_CASES.map((p) => ({ href: `/use-cases/${p.slug}`, label: p.name })) },
  { title: "Compare", base: "/compare", items: COMPARISONS.map((p) => ({ href: `/compare/${p.slug}`, label: p.name })) },
];
const productExtras = [
  { href: "/security", label: "Security" },
  { href: "/changelog", label: "Changelog" },
];

const Navbar: React.FC = () => {
  const [productOpen, setProductOpen] = useState(false);
  const [mobileProduct, setMobileProduct] = useState(false);
  const productRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!productOpen) return;
    const onDown = (e: MouseEvent) => {
      if (productRef.current && !productRef.current.contains(e.target as Node)) setProductOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProductOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [productOpen]);

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const solid = scrolled || isOpen;
  const ink = solid ? "text-[#1b1017]" : "text-white";
  const soft = solid ? "text-[#1b1017]/65 hover:text-[#1b1017]" : "text-white/70 hover:text-white";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || isOpen
          ? "border-b border-[#381d2a]/10 bg-[#f7f2ee]/92 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <button
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2.5"
        >
          <Image src="/logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className={`text-[17px] font-semibold tracking-tight ${ink}`}>WebflowX</span>
        </button>

        <div className="hidden items-center gap-8 md:flex">
          <div
            ref={productRef}
            className="relative"
            onMouseEnter={() => setProductOpen(true)}
            onMouseLeave={() => setProductOpen(false)}
          >
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={productOpen}
              onClick={() => setProductOpen((v) => !v)}
              className={`flex items-center gap-1 text-sm transition-colors ${soft}`}
            >
              Product <ChevronDown className={`h-3.5 w-3.5 transition-transform ${productOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {productOpen && (
              <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3">
                <div className="w-[640px] rounded-2xl border border-[#381d2a]/10 bg-white p-6 text-[#1b1017] shadow-xl">
                  <div className="grid grid-cols-3 gap-6">
                    {productGroups.map((g) => (
                      <div key={g.title}>
                        <Link href={g.base} onClick={() => setProductOpen(false)} className="lp-label text-[#381d2a]/60 hover:text-[#a82d0a]">{g.title}</Link>
                        <ul className="mt-3 space-y-1">
                          {g.items.map((i) => (
                            <li key={i.href}>
                              <Link href={i.href} onClick={() => setProductOpen(false)} className="block rounded-md px-2 py-1.5 text-sm hover:bg-[#f7f2ee]">{i.label}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-6 border-t border-[#381d2a]/10 pt-4 text-sm">
                    {productExtras.map((i) => (
                      <Link key={i.href} href={i.href} onClick={() => setProductOpen(false)} className="font-medium hover:text-[#a82d0a]">{i.label}</Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {menuItems.map((m) => (
            <a
              key={m.href}
              href={m.href}
              onClick={(e) => go(e, m.href)}
              className={`text-sm transition-colors ${soft}`}
            >
              {m.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/auth" className={`hidden text-sm font-medium sm:block ${ink}`}>
            Log in
          </Link>
          <Link
            href="/auth"
            className="hidden rounded-md bg-[#ff5018] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e6430f] sm:block"
          >
            Start free
          </Link>
          <button
            type="button"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            className={`p-2 md:hidden ${ink}`}
          >
            {isOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="border-t border-[#381d2a]/10 px-5 pb-5 md:hidden">
          <button
            type="button"
            aria-expanded={mobileProduct}
            onClick={() => setMobileProduct((v) => !v)}
            className="flex w-full items-center justify-between border-b border-[#381d2a]/10 py-3.5 text-left text-[#1b1017]"
          >
            Product <ChevronDown className={`h-4 w-4 transition-transform ${mobileProduct ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {mobileProduct && (
            <div className="border-b border-[#381d2a]/10 pb-3">
              {[...productGroups.map((g) => ({ title: g.title, items: g.items })), { title: "More", items: productExtras }].map((g) => (
                <div key={g.title} className="pt-3">
                  <p className="lp-label px-1 text-[#381d2a]/55">{g.title}</p>
                  {g.items.map((i) => (
                    <Link key={i.href} href={i.href} onClick={() => setIsOpen(false)} className="block px-1 py-2 text-[15px] text-[#1b1017]/85">{i.label}</Link>
                  ))}
                </div>
              ))}
            </div>
          )}
          {menuItems.map((m) => (
            <a
              key={m.href}
              href={m.href}
              onClick={(e) => go(e, m.href)}
              className="block border-b border-[#381d2a]/10 py-3.5 text-[#1b1017]"
            >
              {m.label}
            </a>
          ))}
          <Link
            href="/auth"
            className="mt-4 block rounded-md bg-[#ff5018] py-3 text-center text-sm font-semibold text-white"
          >
            Start free
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
