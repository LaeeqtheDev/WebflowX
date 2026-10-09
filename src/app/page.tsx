import dynamic from 'next/dynamic'
import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
const TimelineDemo = dynamic(() => import('@/components/Timeline'))
import WhyChooseUs from '@/components/WhyChooseus'
const AppleCardsCarouselDemo = dynamic(() => import('@/components/Team').then(m => m.AppleCardsCarouselDemo))
const TestimonialSection16 = dynamic(() => import('@/components/Testimonials'))
import FeaturesSection from '@/components/Features'
import Footer from '@/components/Footer'
import SecuritySection from '@/components/landing/Security'
import PagesDatabases from '@/components/landing/PagesDatabases'
const FAQSection = dynamic(() => import('@/components/FAQ').then(m => m.FAQSection))
const NewsletterSignup = dynamic(() => import('@/components/newslettersignup').then(m => m.NewsletterSignup))
const PricingSection = dynamic(() => import('@/components/pricing'))
const MergerSection = dynamic(() => import('@/components/Merger').then(m => m.MergerSection))

import { SITE_URL, SITE_LOGO } from '@/lib/site'
import { PLANS, SITE_FAQS } from '@/lib/marketing-content'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'WebflowX',
      url: SITE_URL,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Team chat, tasks, real-time documents and spreadsheets, video meetings with live transcripts and AI summaries, with roles and permissions, in one workspace.',
      publisher: { '@type': 'Organization', name: 'North Foundry' },
      offers: PLANS.map((p) => ({ '@type': 'Offer', name: p.name, price: p.price, priceCurrency: 'USD', description: p.blurb, url: `${SITE_URL}/#pricing` })),
    },
    {
      '@type': 'Organization',
      name: 'North Foundry',
      url: 'https://northfoundry.co',
      email: 'hello@northfoundry.co',
      logo: `${SITE_URL}/northfoundry-logo.png`,
    },
    {
      '@type': 'WebSite',
      name: 'WebflowX',
      url: SITE_URL,
      image: SITE_LOGO,
    },
    {
      '@type': 'FAQPage',
      mainEntity: SITE_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
}

const page = () => {
  return (
    <main className="flex w-full flex-col overflow-x-clip">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Navbar />
      <Hero />
      <FeaturesSection />
      <WhyChooseUs />
      <PagesDatabases />
      <SecuritySection />
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
