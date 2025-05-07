import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { toast } from 'sonner';
import SchedulingCalendar from "@/components/SchedulingCalendar";
import SolarDesignerCard from '@/components/SolarDesignerCard';
import { BookingDialog } from '@/components/BookingDialog';
import { useSearchParams } from 'react-router-dom';
import { Settings } from 'lucide-react';

type SalesRep = {
  id: string;
  name: string;
  email: string;
  percentage?: number;
  bio?: string;
  experience?: string;
  image_url?: string;
  calendar_url?: string;
  rating?: number;
  review_count?: number;
};

const LeadBookingPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedRep, setSelectedRep] = useState<SalesRep | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [leadDetails, setLeadDetails] = useState<any>(null);
  const [routingInfo, setRoutingInfo] = useState<{method?: string; city?: string}>({}); 

  // Parse URL parameters for initial form values
  const initialFormValues = {
    firstName: searchParams.get('first_name') || '',
    lastName: searchParams.get('last_name') || '',
    email: searchParams.get('email_address') || '',
    phone: searchParams.get('phone') || '',
    city: searchParams.get('city') || '',
  };

  // Auto-open dialog if URL parameters are present
  useEffect(() => {
    const hasParams = Object.values(initialFormValues).some(value => value !== '');
    if (hasParams) {
      setIsBookingDialogOpen(true);
    }
  }, []);

  const handleBookMeeting = () => {
    setIsBookingDialogOpen(true);
  };

  const handleFindDesigner = async (formData: any) => {
    setIsLoading(true);
    try {
      // Store the lead details
      setLeadDetails(formData);

      // Get the city and email from the form data
      const { city, email } = formData;
      
      // Call the get-sales-rep edge function directly to use source/city/percentage-based routing logic
      const { data, error } = await supabase.functions.invoke('get-sales-rep', {
        body: { 
          city: city?.toLowerCase()?.trim(),
          email: email?.toLowerCase()?.trim()
        }
      });

      if (error) {
        console.error('Error calling get-sales-rep function:', error);
        toast.error(`Error finding sales rep: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (!data?.salesRep) {
        toast.error('No sales representative found. Please try again later.');
        setIsLoading(false);
        return;
      }
      
      // Set the selected rep and routing info
      setSelectedRep(data.salesRep);
      setRoutingInfo({
        method: data.routingMethod,
        city: data.city,
      });
      
      console.log('Sales rep matched:', data.salesRep.name, 'using method:', data.routingMethod);
      toast.success(`We've matched you with ${data.salesRep.name}!`);
      
      // Close the booking dialog and show the rep card
      setIsBookingDialogOpen(false);
      
    } catch (err) {
      console.error('Error finding sales rep:', err);
      toast.error('Error finding a sales representative. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-b from-white to-blue-50">
      {/* Solar-themed background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-300 rounded-full opacity-10 -mt-12 -mr-12"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600 rounded-full opacity-5 -mb-12 -ml-12"></div>
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-yellow-400 rounded-full opacity-5"></div>
      </div>
      
      {/* Header */}
      <header className="py-6 px-4 w-full bg-white shadow-sm z-10 relative">
        <div className="container mx-auto flex justify-center">
          <img 
            src="https://www.cobaltpower.com/images/logos/Transparent-Logo.2212160539550.png" 
            alt="Cobalt Power Logo" 
            className="h-16 md:h-20" 
          />
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-10 flex flex-col items-center justify-center relative z-10">
        {!selectedRep && !isLoading ? (
          <div className="text-center max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8 relative overflow-hidden">
              {/* Solar Panel Background Image */}
              <div className="absolute inset-0 z-0 opacity-5">
                <img 
                  src="https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1000" 
                  alt="Solar Panels" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Sun Icon */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-400 rounded-full opacity-20"></div>
              
              <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-yellow-500">
                  Solar Design Consultation
                </h1>
                
                <p className="text-gray-600 mb-8 text-lg md:text-xl leading-relaxed">
                  Schedule a consultation with one of our expert solar designers to discuss your energy needs and start your journey towards sustainable power.
                </p>
                
                <Button 
                  onClick={handleBookMeeting} 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-blue-200 text-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book a Free Consultation
                </Button>
              </div>
              
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-left border border-blue-100 shadow-sm">
                  <div className="bg-blue-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-md text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Expert Guidance</h3>
                  <p className="text-blue-700">Get personalized advice from certified solar design professionals.</p>
                </div>
                
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 text-left border border-yellow-100 shadow-sm">
                  <div className="bg-yellow-500 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-md text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Energy Savings</h3>
                  <p className="text-yellow-700">Learn how much you can save by switching to solar power.</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-left border border-blue-100 shadow-sm">
                  <div className="bg-blue-600 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-md text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Custom Solutions</h3>
                  <p className="text-blue-700">Tailored designs for your home's unique energy requirements.</p>
                </div>
              </div>
              
              {/* Solar facts section */}
              <div className="mt-16 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white relative z-10">
                <h3 className="text-xl font-bold mb-3">Why Go Solar?</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4">
                    <div className="text-2xl font-bold text-yellow-300 mb-1">25+</div>
                    <p className="text-blue-100">Years of system lifespan</p>
                  </div>
                  <div className="p-4">
                    <div className="text-2xl font-bold text-yellow-300 mb-1">30%</div>
                    <p className="text-blue-100">Average utility bill savings</p>
                  </div>
                  <div className="p-4">
                    <div className="text-2xl font-bold text-yellow-300 mb-1">$0</div>
                    <p className="text-blue-100">Down payment options</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Finding Your Perfect Match</h3>
            <p className="text-gray-600">We're pairing you with an expert solar designer who specializes in your area...</p>
          </div>
        ) : selectedRep && !showCalendar ? (
          <div className="text-center max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white relative overflow-hidden">
              {/* Solar-themed background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="grid grid-cols-8 gap-2 w-full h-full">
                  {Array(32).fill(0).map((_, i) => (
                    <div key={i} className="bg-yellow-400 rounded-sm"></div>
                  ))}
                </div>
              </div>
              <div className="relative z-10">
                <div className="animate-pulse inline-block bg-yellow-400 backdrop-blur-sm rounded-full p-4 mb-4 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-3">
                  We Found Your Perfect Match!
                </h2>
                <p className="text-xl text-blue-100 max-w-2xl mx-auto">
                  Meet {selectedRep.name}, your dedicated solar design expert who will guide you through your sustainable energy journey.
                </p>
              </div>
            </div>
            
            <div className="p-8 relative">
              {/* Subtle sun rays background */}
              <div className="absolute inset-0 z-0 overflow-hidden opacity-5">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
                  {Array(12).fill(0).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute w-4 h-72 bg-yellow-400 origin-bottom" 
                      style={{ transform: `rotate(${i * 30}deg)` }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="relative z-10">
                {routingInfo.method === 'city' && routingInfo.city && (
                  <div className="mb-4 inline-block bg-blue-50 rounded-full px-4 py-1 text-blue-700">
                    <span className="text-sm font-medium">
                      {selectedRep.name} specializes in solar design for {routingInfo.city} and surrounding areas
                    </span>
                  </div>
                )}
                {routingInfo.method === 'source' && (
                  <div className="mb-4 inline-block bg-blue-50 rounded-full px-4 py-1 text-blue-700">
                    <span className="text-sm font-medium">
                      {selectedRep.name} specializes in handling leads from your source channel
                    </span>
                  </div>
                )}
                
                <SolarDesignerCard
                  name={selectedRep.name}
                  email={selectedRep.email}
                  bio={selectedRep.bio}
                  experience={selectedRep.experience}
                  imageUrl={selectedRep.image_url}
                  rating={selectedRep.rating}
                  reviewCount={selectedRep.review_count}
                  id={selectedRep.id}
                />
                
                <Button 
                  onClick={() => setShowCalendar(true)} 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-6 rounded-xl shadow-lg transition-all duration-300 hover:shadow-blue-200 mt-8 text-xl w-full md:w-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Schedule Your Consultation
                </Button>
              </div>
            </div>
          </div>
        ) : showCalendar ? (
          <div className="w-full">
            <h2 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-yellow-500">
              Schedule Your Consultation with {selectedRep?.name}
            </h2>
            <SchedulingCalendar 
              salesRep={selectedRep} 
              leadDetails={leadDetails}
              salesRepEmail={selectedRep?.email}
            />
          </div>
        ) : null}

        <BookingDialog 
          isOpen={isBookingDialogOpen}
          onClose={() => setIsBookingDialogOpen(false)}
          onSubmit={handleFindDesigner}
          buttonText="Find available solar designer"
          initialValues={initialFormValues}
        />
      </main>
      
      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="container mx-auto">
          <div className="flex justify-center space-x-6 mb-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Solar Powered Future</span>
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Eco-Friendly Energy</span>
            </div>
          </div>
          <div className="text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} Solar Powered Future. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Admin Link - Fixed Position */}
      <a 
        href="/admin/login" 
        className="fixed bottom-2 right-2 z-50 h-6 w-6 bg-transparent border-0 rounded-none outline-none p-0 text-gray-200/20 hover:text-gray-300/30 transition-opacity duration-300"
        aria-label="Admin dashboard"
      >
        <Settings className="h-2.5 w-2.5" />
      </a>
    </div>
  );
};

export default LeadBookingPage;
