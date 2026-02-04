import React from 'react';
import { 
  BarChart3, 
  Truck, 
  ShieldCheck, 
  Cloud, 
  Zap ,
  PenTool
} from 'lucide-react';

const NewFeatures: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-white w-full">
      {/* Background Decor Elements */}
      <div className="pointer-events-none absolute -bottom-52 right-0 w-136 h-136 bg-gradient-to-br from-orange-300 to-lime-200 rounded-full opacity-30 blur-3xl" />
      <div className="pointer-events-none absolute -top-40 -left-40 w-120 h-120 bg-gradient-to-br from-orange-400 to-yellow-200 rounded-full opacity-40 blur-3xl" />
      

      <div id="new-features" className="relative z-10 py-8 sm:py-10 lg:py-16">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl xl:text-4xl">
              Boost Your Productivity
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-8">
              Enhance your workflow with advanced features
            </p>
          </div>

          <div className="grid grid-cols-1 mt-10 text-center sm:mt-16 sm:grid-cols-2 sm:gap-x-12 gap-y-12 md:grid-cols-3 md:gap-0 xl:mt-24">
            
            {/* Feature 1 */}
            <div className="md:p-8 lg:p-14 flex flex-col justify-center items-center">
              <div className="w-14 h-14 rounded-full bg-purple-200 flex justify-center items-center">
                <BarChart3 className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="mt-12 text-xl font-bold text-gray-900">Advanced Analytics</h3>
              <p className="mt-5 text-base text-gray-600">
                Track and analyze your data with powerful analytics tools. Gain valuable insights for better decision-making.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="md:p-8 lg:p-14 md:border-l md:border-gray-200 flex flex-col justify-center items-center">
              <div className="w-14 h-14 rounded-full bg-teal-200 flex justify-center items-center">
                <Truck className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="mt-12 text-xl font-bold text-gray-900">Fast Integration</h3>
              <p className="mt-5 text-base text-gray-600">
                Seamlessly integrate with your existing tools and systems for a smooth workflow experience.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="md:p-8 lg:p-14 md:border-l md:border-gray-200 flex flex-col justify-center items-center">
              <div className="w-14 h-14 rounded-full bg-yellow-200 flex justify-center items-center">
                <ShieldCheck className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="mt-12 text-xl font-bold text-gray-900">Security First</h3>
              <p className="mt-5 text-base text-gray-600">
                Ensure the safety of your data with top-notch security features. Your privacy is our priority.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="md:p-8 lg:p-14 md:border-t md:border-gray-200 flex flex-col justify-center items-center">
              <div className="w-14 h-14 rounded-full bg-red-200 flex justify-center items-center">
                <Cloud className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="mt-12 text-xl font-bold text-gray-900">Cloud Integration</h3>
              <p className="mt-5 text-base text-gray-600">
                Access your data from anywhere with seamless cloud integration. Work without boundaries.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="md:p-8 lg:p-14 md:border-l md:border-gray-200 md:border-t flex flex-col justify-center items-center">
              <div className="w-14 h-14 rounded-full bg-green-200 flex justify-center items-center">
                <PenTool className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="mt-12 text-xl font-bold text-gray-900">Task Management</h3>
              <p className="mt-5 text-base text-gray-600">
                Organize your workflow with efficient task management features. Stay on top of your projects effortlessly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="md:p-8 lg:p-14 md:border-l md:border-gray-200 md:border-t flex flex-col justify-center items-center">
              <div className="w-14 h-14 rounded-full bg-orange-200 flex justify-center items-center">
                <Zap className="w-8 h-8 text-gray-900" />
              </div>
              <h3 className="mt-12 text-xl font-bold text-gray-900">Performance Metrics</h3>
              <p className="mt-5 text-base text-gray-600">
                Monitor and measure your performance with comprehensive metrics. Optimize your processes for maximum efficiency.
              </p>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewFeatures;