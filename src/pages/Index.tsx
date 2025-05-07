import SchedulingCalendar from "@/components/SchedulingCalendar";
import { Button } from "@/components/ui/button";
import { getGoogleAuthUrl } from "@/utils/googleCalendarAdmin";
import { Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminRouting from "@/components/AdminRouting";
import { Link } from "react-router-dom";

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleCalendarConfigured, setIsGoogleCalendarConfigured] = useState(false);
  
  useEffect(() => {
    const checkGoogleCalendarConfig = async () => {
      try {
        const { data } = await supabase.functions.invoke('google-calendar', {
          body: { 
            action: 'checkConfiguration'
          }
        });

        if (data?.isConfigured) {
          setIsGoogleCalendarConfigured(true);
        }
      } catch (error) {
        console.error('Failed to check Google Calendar configuration:', error);
      }
    };

    checkGoogleCalendarConfig();
  }, []);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const authUrl = await getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to get Google auth URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <img 
              src="https://www.cobaltpower.com/images/logos/Transparent-Logo.2212160539550.png" 
              alt="Cobalt Power Logo" 
              className="h-16 mb-2"
            />
            <h1 className="text-3xl font-bold text-brand">Schedule a Meeting</h1>
            <p className="text-gray-600 mt-2">Choose your preferred time slot with our sales team</p>
          </div>
          
          <div className="mt-4 space-x-2">
            <Button 
              variant="outline"
              className="bg-brand/10 text-brand hover:bg-brand/20"
              asChild
            >
              <Link to="/book">Book a Meeting</Link>
            </Button>
            {!isGoogleCalendarConfigured && (
              <Button 
                onClick={handleGoogleAuth}
                className="bg-brand hover:bg-brand/90 flex items-center gap-2"
                disabled={isLoading}
              >
                <Calendar className="h-4 w-4" />
                {isLoading ? 'Loading...' : 'Configure Google Calendar'}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main>
        <SchedulingCalendar />
      </main>
      <AdminRouting />
    </div>
  );
};

export default Index;
