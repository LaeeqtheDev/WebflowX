

import Hero from '@/components/Hero'
import Navbar from '@/components/Navbar'
import TimelineDemo from '@/components/Timeline'
import WhyChooseUs from '@/components/WhyChooseus'

    const page = () => {
    return (
        <div className='flex justify-between items-center mb-0 flex-col'>
            <Navbar/>
            <Hero/>
            <WhyChooseUs/>
            <TimelineDemo/>
           
            
        </div>
    )
    }

    export default page