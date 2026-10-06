import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
import TimelineDemo from '@/components/Timeline'
import WhyChooseUs from '@/components/WhyChooseus'
import { AppleCardsCarouselDemo } from '@/components/Team'
import TestimonialSection16 from '@/components/Testimonials'
import FeaturesSection from '@/components/Features'
import Footer from '@/components/Footer'
import { FAQSection } from '@/components/FAQ'
import { NewsletterSignup } from '@/components/newslettersignup'
import PricingSection from '@/components/pricing'
import { MergerSection } from '@/components/Merger'

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
