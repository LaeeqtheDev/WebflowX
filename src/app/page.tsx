import dynamic from 'next/dynamic'
import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
import WhyChooseUs from '@/components/WhyChooseus'
import FeaturesSection from '@/components/Features'
import Footer from '@/components/Footer'
import SecuritySection from '@/components/landing/Security'
import AgentsSection from '@/components/landing/Agents'
import FinalCta from '@/components/landing/FinalCta'
import HowItWorks from '@/components/landing/HowItWorks'
import Proof from '@/components/landing/Proof'
const StackCompare = dynamic(() => import('@/components/landing/StackCompare'))
const FAQSection = dynamic(() => import('@/components/FAQ').then(m => m.FAQSection))
const NewsletterSignup = dynamic(() => import('@/components/newslettersignup').then(m => m.NewsletterSignup))
const PricingSection = dynamic(() => import('@/components/pricing'))

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
        'Team chat, tasks, real-time documents and spreadsheets, video meetings with live transcripts and AI summaries, and AI agents that turn meetings and chat requests into tasks, with roles and permissions, in one workspace.',
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
      <Proof />
      <AgentsSection />
      <StackCompare />
      <HowItWorks />
      <FeaturesSection />
      <WhyChooseUs />
      <SecuritySection />
      <PricingSection />
      <FAQSection />
      <FinalCta />
      <NewsletterSignup />
      <Footer />
    </main>
  )
}

export default page
