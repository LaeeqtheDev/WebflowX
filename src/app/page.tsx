

import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
import TimelineDemo from '@/components/Timeline'
import WhyChooseUs from '@/components/WhyChooseus'
import {GoogleGeminiEffectDemo} from '@/components/GeminiTypeSection'
import { WobbleCardDemo } from '@/components/WobbleCard'
import { AppleCardsCarouselDemo } from '@/components/Team'
import TestimonialSection16 from '@/components/Testimonials'
import { FeaturesWobbleSection } from '@/components/Featurewobble'
import { TeamGrowthChartSection } from '@/components/Teamgrowth'
import WorldMapSection from '@/components/WorldMap'
import FeaturesSection from '@/components/Features'
import Footer from '@/components/Footer'
import { FAQSection } from '@/components/FAQ'
import { NewsletterSignup } from '@/components/newslettersignup'




    const page = () => {
    return (
        <div className='flex justify-between items-center mb-0 flex-col '>
    <Navbar />

<Hero />                     
<WhyChooseUs />              

<FeaturesWobbleSection />   
<FeaturesSection />         

<TimelineDemo />             
<TestimonialSection16 />     

<AppleCardsCarouselDemo /> 
<FAQSection/>
<NewsletterSignup/>
  
<Footer/>
{/* <GoogleGeminiEffectDemo/>
            */}
            
        </div>
    )
    }

    export default page