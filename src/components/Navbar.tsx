"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";

const Navbar: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = [
    { label: "Home", href: "#hero" },
    { label: "Features", href: "#features" },
    { label: "Our Journey", href: "#timeline" },
    { label: "Team", href: "#team" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMenu}
        />
      )}

      <nav className="container w-full z-50 top-0 left-0 sticky  ">
        <div className="max-w-7xl flex items-center justify-between mx-auto p-4">
          {/* Logo */}
          <div
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center cursor-pointer justify-center"
          >
            <span className="text-xl font-semibold text-heading leading-none -mr-3">
              Webflow
            </span>
            <img src="/logo.png" alt="Logo" className="w-10 h-10 block ml-1" />
          </div>

          {/* Desktop Menu - Centered */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8 flex-1 justify-center">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="text-heading text-sm lg:text-base hover:text-[#ff5018] relative py-2 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-[#ff5018] after:transition-all after:duration-300 hover:after:w-full cursor-pointer"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop Login Button */}
          <div className="hidden md:block">
            <Button
              className="text-white flex gap-2 bg-black hover:bg-[#ff5018] border border-transparent focus:ring-4 focus:ring-[#ff5018]/30 shadow-sm font-medium rounded-md text-sm px-4 py-2"
              onClick={() => router.push("/auth")}
            >
              <img src="/arrow.svg" className="h-4 w-4" alt="arrow" />
              Login
            </Button>
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="inline-flex items-center">
            <span className="text-lg font-semibold text-heading -mr-2">
              Webflow
            </span>
            <img src="/logo.png" alt="Logo" className="w-8 h-8 ml-1" />
          </div>
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-gray-100 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="flex flex-col p-4 space-y-1">
          {menuItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className="block py-3 px-4 rounded-md text-gray-700 hover:bg-[#ff5018]/10 hover:text-[#ff5018] transition-colors cursor-pointer"
            >
              {item.label}
            </a>
          ))}

          {/* Mobile Login Button */}
          <div className="pt-4 border-t mt-4">
            <Button
              className="w-full text-white bg-black hover:bg-[#ff5018] border border-transparent shadow-sm font-medium rounded-md text-sm px-4 py-2.5 flex items-center justify-center gap-2"
              onClick={() => {
                router.push("/auth");
                setIsOpen(false);
              }}
            >
              <img src="/arrow.svg" className="h-4 w-4" alt="arrow" />
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;