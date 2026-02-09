"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

const Navbar: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const menuItems = ["Home", "Features", "Pricing", "Docs", "About", "Contact"];

  return (
    <nav className="container w-full z-50 top-0 left-0">
      <div className="max-w-7xl flex flex-wrap items-center justify-between mx-auto p-4 relative">
        {/* Logo */}
        <div
          onClick={() => router.push("/")}
          className="inline-flex items-center cursor-pointer justify-center"
        >
          <span className="text-xl font-semibold text-heading leading-none -mr-3">
            Webflow
          </span>

          <img src="/logo.png" alt="Logo" className="w-10 h-10 block ml-1 " />
        </div>

        {/* Desktop button & Hamburger */}
        <div className="flex items-center md:order-2 space-x-3">
          {/* Desktop only */}
          <div className="hidden md:block">
            <Button
              className="text-white flex gap-2 bg-black hover:bg-brand-strong border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-3 py-2 focus:outline-none cursor-pointer"
              onClick={() => router.push("/auth")}
            >
              <img src="/arrow.svg" className="h-4 w-4" />
              Login
            </Button>
          </div>

          {/* Hamburger for mobile */}
          <button
            type="button"
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-body rounded-base md:hidden hover:bg-neutral-secondary-soft hover:text-heading focus:outline-none focus:ring-2 focus:ring-neutral-tertiary"
            onClick={toggleMenu}
          >
            <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
            <svg
              className="w-6 h-6"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
                d={isOpen ? "M6 18L18 6M6 6l12 12" : "M5 7h14M5 12h14M5 17h14"}
              />
            </svg>
          </button>
        </div>

        {/* Menu Items / Sidebar */}
        <div
          className={`fixed top-0 right-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 md:static md:flex md:w-auto md:h-auto md:translate-x-0 ${
            isOpen ? "translate-x-0 shadow-lg" : "translate-x-full"
          }`}
        >
          {/* Close button for mobile */}
          <div className="flex justify-end p-4 md:hidden">
            <button
              onClick={toggleMenu}
              className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>

          <ul className="flex flex-col md:flex-row md:space-x-8 w-full mt-20 md:mt-0 px-4 py-6 md:p-0 space-y-4 md:space-y-0">
            {menuItems.map((item) => (
              <li key={item}>
                <a
                  href="#"
                  className={`block py-2 px-3 rounded text-heading md:text-fg-brand md:p-0 relative md:after:absolute md:after:left-0 md:after:-bottom-1 md:after:h-0.5 md:after:w-0 md:after:bg-orange-400 md:after:transition-all md:after:duration-300 md:hover:after:w-full hover:bg-orange-500/20 md:hover:bg-transparent`}
                  onClick={() => setIsOpen(false)}
                >
                  {item}
                </a>
              </li>
            ))}

            {/* Mobile Get Started inside menu */}
            <li className="md:hidden">
              <Button
                className="w-full text-white bg-black hover:bg-brand-strong border border-transparent focus:ring-4 focus:ring-brand-medium shadow-xs font-medium leading-5 rounded-base text-sm px-3 py-2 focus:outline-none cursor-pointer"
                onClick={() => {
                  router.push("/auth");
                  setIsOpen(false);
                }}
              >
                Get Started
              </Button>
            </li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-in-out forwards;
        }
      `}</style>
    </nav>
  );
};

export default Navbar;
