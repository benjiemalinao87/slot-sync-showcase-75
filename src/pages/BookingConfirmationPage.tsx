import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookingConfirmation } from '@/components/BookingConfirmation';
import { triggerConfetti } from '@/lib/confetti';

const BookingConfirmationPage = () => {
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Try to get booking details from the location state first
    if (location.state?.bookingDetails) {
      setBookingDetails(location.state.bookingDetails);
      // Run confetti effect on successful booking
      triggerConfetti();
      return;
    }
    
    // If not in location state, try to retrieve from sessionStorage
    const savedBooking = sessionStorage.getItem('lastBooking');
    if (savedBooking) {
      try {
        const parsedDetails = JSON.parse(savedBooking);
        // Make sure date objects are reconstituted properly
        if (parsedDetails.date) parsedDetails.date = new Date(parsedDetails.date);
        if (parsedDetails.startTime) parsedDetails.startTime = new Date(parsedDetails.startTime);
        if (parsedDetails.endTime) parsedDetails.endTime = new Date(parsedDetails.endTime);
        
        setBookingDetails(parsedDetails);
        // Run confetti effect on successful booking
        triggerConfetti();
        return;
      } catch (error) {
        console.error('Error parsing saved booking details:', error);
      }
    }
    
    // If no booking details are found anywhere, show a message or redirect
    if (!bookingDetails) {
      // Redirect after a brief delay if no booking was found
      const timer = setTimeout(() => navigate('/'), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <img 
        src="https://www.cobaltpower.com/images/logos/Transparent-Logo.2212160539550.png" 
        alt="Cobalt Power Logo" 
        className="h-24 mb-8" 
      />
      
      {bookingDetails ? (
        <BookingConfirmation bookingDetails={bookingDetails} />
      ) : (
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-4">Looking for booking details...</h2>
          <p className="text-gray-600">
            If you're not redirected shortly, please click 
            <button 
              onClick={() => navigate('/')} 
              className="text-blue-500 underline ml-1"
            >
              here
            </button> 
            to return to the home page.
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingConfirmationPage; 