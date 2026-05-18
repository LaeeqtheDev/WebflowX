import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
import TimelineDemo from '@/components/Timeline'
import WhyChooseUs from '@/components/WhyChooseus'

import { AppleCardsCarouselDemo } from '@/components/Team'
import TestimonialSection16 from '@/components/Testimonials'
import { FeaturesWobbleSection } from '@/components/Featurewobble'

import FeaturesSection from '@/components/Features'
import Footer from '@/components/Footer'
import { FAQSection } from '@/components/FAQ'
import { NewsletterSignup } from '@/components/newslettersignup'
import PricingSection from '@/components/pricing'

const page = () => {
  return (
    <div className='flex justify-between items-center mb-0 flex-col'>
      {/* 1. Navigation */}
      <Navbar />

      {/* 2. Hero Section - First impression */}
      <Hero />

      {/* 3. Why Choose Us - Value proposition with video */}
      <WhyChooseUs />

      {/* 4. Features Overview - Main features grid */}
      <FeaturesSection />

      {/* 5. Features Wobble - Detailed feature showcase */}
      <FeaturesWobbleSection />

      {/* 6. How It Works - Timeline/Process */}
      <TimelineDemo />

      {/* 7. Meet the Team - Build trust */}
      <AppleCardsCarouselDemo />

      {/* 8. Social Proof - Customer testimonials */}
      <TestimonialSection16 />

      {/* 9. Pricing - Show plans after they're convinced */}
      <PricingSection />

      {/* 10. FAQ - Address concerns */}
      <FAQSection />

      {/* 11. Newsletter - Capture leads */}
      <NewsletterSignup />

      {/* 12. Footer - Final navigation & info */}
      <Footer />

      {/* Optional/Future sections */}
      {/* <GoogleGeminiEffectDemo /> */}
      {/* <TeamGrowthChartSection /> */}
      {/* <WorldMapSection /> */}
    </div>
  )
}

export default page