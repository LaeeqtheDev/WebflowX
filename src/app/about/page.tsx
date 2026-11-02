import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
const MergerSection = dynamic(() => import('@/components/Merger').then(m => m.MergerSection))
const TimelineDemo = dynamic(() => import('@/components/Timeline'))
const AppleCardsCarouselDemo = dynamic(() => import('@/components/Team').then(m => m.AppleCardsCarouselDemo))
const TestimonialSection16 = dynamic(() => import('@/components/Testimonials'))

export const metadata: Metadata = {
  title: 'About',
  description: 'Why North Foundry built WebflowX, how it came together, and the people behind it.',
  alternates: { canonical: '/about' },
  openGraph: { title: 'About | WebflowX', description: 'Why North Foundry built WebflowX, and the people behind it.', url: '/about' },
}

// The company story lives here so the homepage can stay a straight line from "what is it" to "start free".
export default function AboutPage() {
  return (
    <main className="flex w-full flex-col overflow-x-clip">
      <Navbar />
      <section className="w-full bg-[#22101a] pb-20 pt-36 text-white md:pb-28 md:pt-44">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <p className="lp-label text-white/60">About WebflowX</p>
          <h1 className="lp-h mt-5 max-w-4xl text-[2.6rem] leading-[1.05] sm:text-6xl md:text-7xl">One workspace, built by a studio that ships.</h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-white/70">
            WebflowX is made by North Foundry. This is why we built it, how it came together, and who works on it.
          </p>
          <Link href="/auth?mode=signup" className="mt-9 inline-flex rounded-lg bg-[#ff5018] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#ff6a3a]">
            Start free
          </Link>
        </div>
      </section>
      <MergerSection />
      <TimelineDemo />
      <AppleCardsCarouselDemo />
      <TestimonialSection16 />
      <Footer />
    </main>
  )
}
