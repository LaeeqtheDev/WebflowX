"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const menuItems = [
  { label: "Product", href: "#features" },
  { label: "Merger", href: "#merger" },
  { label: "Journey", href: "#timeline" },
  { label: "Team", href: "#team" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const Navbar: React.FC = () => {
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
