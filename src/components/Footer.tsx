"use client";

import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');
        * { font-family: 'Poppins', sans-serif; }
      `}</style>

      <footer className="w-full bg-black text-gray-400 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-16 py-12 sm:py-16 lg:py-20">
          
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            
            {/* Logo & Description - Spans 2 columns on large screens */}
            <div className="lg:col-span-2">
              <Link href="/" className="inline-block mb-4">
                <Image
                  src="/logo.png"
                  alt="WebflowX Logo"
                  width={48}
                  height={48}
                  className="object-cover w-12 h-12 sm:w-14 sm:h-14"
                  priority
                />
              </Link>
              <p className="text-sm sm:text-base text-gray-300 max-w-sm mb-6">
                Making every customer feel valued—no matter the size of your audience.
              </p>
              
              {/* Socials - Mobile at bottom, Desktop here */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <Link href="#" aria-label="Dribbble" className="hover:text-[#ff5018] transition-colors">
                  Dribbble
                </Link>
                <Link href="#" aria-label="LinkedIn" className="hover:text-[#ff5018] transition-colors">
                  LinkedIn
                </Link>
                <Link href="#" aria-label="X" className="hover:text-[#ff5018] transition-colors">
                  X
                </Link>
                <Link href="#" aria-label="YouTube" className="hover:text-[#ff5018] transition-colors">
                  YouTube
                </Link>
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Product</p>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Affiliate
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <p className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Resources</p>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Company
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Blogs
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-flex items-center gap-2 flex-wrap">
                    Careers
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-md bg-orange-500/40 text-white whitespace-nowrap">
                      We're hiring!
                    </span>
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    About
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-white font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Legal</p>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-[#ff5018] transition-colors inline-block">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Socials - Mobile Only */}
          <div className="md:hidden flex flex-wrap items-center justify-center gap-4 mt-8 text-sm">
            <Link href="#" aria-label="Dribbble" className="hover:text-[#ff5018] transition-colors">
              Dribbble
            </Link>
            <Link href="#" aria-label="LinkedIn" className="hover:text-[#ff5018] transition-colors">
              LinkedIn
            </Link>
            <Link href="#" aria-label="X" className="hover:text-[#ff5018] transition-colors">
              X
            </Link>
            <Link href="#" aria-label="YouTube" className="hover:text-[#ff5018] transition-colors">
              YouTube
            </Link>
          </div>

          {/* Bottom Bar */}
          <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-800 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              © 2025 <span className="text-white font-medium">WebflowX</span>. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}