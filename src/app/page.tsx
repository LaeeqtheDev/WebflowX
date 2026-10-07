import dynamic from 'next/dynamic'
import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
const TimelineDemo = dynamic(() => import('@/components/Timeline'))
import WhyChooseUs from '@/components/WhyChooseus'
const AppleCardsCarouselDemo = dynamic(() => import('@/components/Team').then(m => m.AppleCardsCarouselDemo))
const TestimonialSection16 = dynamic(() => import('@/components/Testimonials'))
import FeaturesSection from '@/components/Features'
import Footer from '@/components/Footer'
const FAQSection = dynamic(() => import('@/components/FAQ').then(m => m.FAQSection))
const NewsletterSignup = dynamic(() => import('@/components/newslettersignup').then(m => m.NewsletterSignup))
const PricingSection = dynamic(() => import('@/components/pricing'))
const MergerSection = dynamic(() => import('@/components/Merger').then(m => m.MergerSection))

const page = () => {
  return (
    <main className="flex w-full flex-col overflow-x-clip">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <WhyChooseUs />
      <MergerSection />
      <TimelineDemo />
      <AppleCardsCarouselDemo />
      <TestimonialSection16 />
      <PricingSection />
      <FAQSection />
      <NewsletterSignup />
      <Footer />
    </main>
  )
}

export default page
