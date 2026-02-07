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

      <footer className="w-full flex flex-wrap justify-center lg:justify-between overflow-hidden gap-10 md:gap-20 py-16 px-6 md:px-16 lg:px-24 xl:px-32 text-[13px] text-gray-500 bg-black">
        {/* Left Links & Logo */}
        <div className="flex flex-wrap items-start gap-10 md:gap-15 xl:gap-35">
          
          {/* Logo */}
          <Link href="/">
            <Image
              src="/logo.png"
              alt="WebflowX Logo"
              width={36}
              height={36}
              className="object-cover w-15 h-15"
              priority
            />
          </Link>

          {/* Product */}
          <div>
            <p className="text-slate-100 font-semibold">Product</p>
            <ul className="mt-2 space-y-2">
              <li><Link href="/" className="hover:text-orange-600 transition">Home</Link></li>
              <li><Link href="/" className="hover:text-orange-600 transition">Support</Link></li>
              <li><Link href="/" className="hover:text-orange-600 transition">Pricing</Link></li>
              <li><Link href="/" className="hover:text-orange-600 transition">Affiliate</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="text-slate-100 font-semibold">Resources</p>
            <ul className="mt-2 space-y-2">
              <li><Link href="/" className="hover:text-orange-600 transition">Company</Link></li>
              <li><Link href="/" className="hover:text-orange-600 transition">Blogs</Link></li>
              <li><Link href="/" className="hover:text-orange-600 transition">Community</Link></li>
              <li>
                <Link href="/" className="hover:text-orange-600 transition flex items-center gap-2">
                  Careers
                  <span className="text-xs px-2 py-1 rounded-md bg-orange-500/40 text-white">
                    We’re hiring!
                  </span>
                </Link>
              </li>
              <li><Link href="/" className="hover:text-orange-600 transition">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-slate-100 font-semibold">Legal</p>
            <ul className="mt-2 space-y-2">
              <li><Link href="/" className="hover:text-orange-600 transition">Privacy</Link></li>
              <li><Link href="/" className="hover:text-orange-600 transition">Terms</Link></li>
            </ul>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex flex-col max-md:items-center max-md:text-center gap-2 items-end">
          <p className="max-w-60 text-gray-300">
            Making every customer feel valued—no matter the size of your audience.
          </p>

          {/* Socials */}
          <div className="flex items-center gap-4 mt-3">
            <Link href="#" aria-label="Dribbble" className="hover:text-orange-500">Dribbble</Link>
            <Link href="#" aria-label="LinkedIn" className="hover:text-orange-500">LinkedIn</Link>
            <Link href="#" aria-label="X" className="hover:text-orange-500">X</Link>
            <Link href="#" aria-label="YouTube" className="hover:text-orange-500">YouTube</Link>
          </div>

          <p className="mt-3 text-center text-gray-500">
            © 2025 <span className="text-white">WebflowX</span>
          </p>
        </div>
      </footer>
    </>
  );
}
