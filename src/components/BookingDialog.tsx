import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TimeSlot, ExtendedBookingDetails } from "@/types/calendar";
import { Textarea } from "@/components/ui/textarea";

interface BookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  buttonText?: string;
  onBook?: (details: ExtendedBookingDetails) => Promise<void>;
  onSubmit?: (details: BookingFormData) => Promise<void>;
  initialValues?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    city?: string;
    interest?: string;
    notes?: string;
  };
}

interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  interest: string;
  notes?: string;
}

export const BookingDialog = ({ 
  isOpen, 
  onClose, 
  buttonText = "Confirm Booking",
  onBook,
  onSubmit,
  initialValues = {} 
}: BookingDialogProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [firstName, setFirstName] = useState(initialValues.firstName || '');
  const [lastName, setLastName] = useState(initialValues.lastName || '');
  const [email, setEmail] = useState(initialValues.email || '');
  const [phone, setPhone] = useState(initialValues.phone || '');
  const [city, setCity] = useState(initialValues.city || '');
  const [interest, setInterest] = useState(initialValues.interest || '');
  const [notes, setNotes] = useState(initialValues.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFirstName(initialValues.firstName || '');
    setLastName(initialValues.lastName || '');
    setEmail(initialValues.email || '');
    setPhone(initialValues.phone || '');
    setCity(initialValues.city || '');
    setInterest(initialValues.interest || '');
    setNotes(initialValues.notes || '');
  }, [initialValues]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      const formData = {
        firstName,
        lastName,
        email,
        phone,
        city: city || undefined,
        interest,
        notes
      };

      if (onSubmit) {
        await onSubmit(formData);
      } else if (onBook) {
        await onBook({
          ...formData,
          slot: null
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const goToPrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      return firstName.trim() !== '' && lastName.trim() !== '';
    } else if (currentStep === 2) {
      return email.trim() !== '' && phone.trim() !== '';
    }
    return true;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-gray-700 font-medium">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all py-5"
                  placeholder="Your first name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-gray-700 font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all py-5"
                  placeholder="Your last name"
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 pl-10 transition-all py-5"
                  placeholder="your.email@example.com"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-gray-700 font-medium">Phone (with country code)</Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  className="rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 pl-10 transition-all py-5"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="city" className="text-gray-700 font-medium">City</Label>
              <div className="relative">
                <Input
                  id="city"
                  placeholder="Enter your city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 pl-10 transition-all py-5"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500 ml-1">Helps us match you with a local solar expert</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="interest" className="text-gray-700 font-medium">What interests you about solar?</Label>
              <div className="relative">
                <select
                  id="interest"
                  value={interest}
                  onChange={e => setInterest(e.target.value)}
                  required
                  className="w-full rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all py-2.5 pl-10 pr-10 appearance-none"
                >
                  <option value="" disabled>Select your primary interest</option>
                  <option value="Energy savings">Energy savings</option>
                  <option value="Environmental benefits">Environmental benefits</option>
                  <option value="Energy independence">Energy independence</option>
                  <option value="Tax incentives">Tax incentives</option>
                  <option value="Home value increase">Home value increase</option>
                  <option value="Other">Other</option>
                </select>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-gray-700 font-medium">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any specific questions or concerns?"
                className="rounded-lg border-gray-200 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 min-h-[80px] transition-all"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-xl border-none shadow-2xl p-0 overflow-hidden">
        {/* Solar-themed header */}
        <div className="bg-gradient-to-r from-blue-600 to-yellow-600 p-6 relative">
          {/* Solar panel pattern in background */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-8 gap-1 w-full h-full">
              {Array(24).fill(0).map((_, i) => (
                <div key={i} className="bg-white rounded-sm"></div>
              ))}
            </div>
          </div>
          
          <div className="relative z-10">
            <div className="bg-yellow-500 h-12 w-12 rounded-full mb-3 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <DialogTitle className="text-2xl font-bold text-white mb-1">Book Appointment</DialogTitle>
            <DialogDescription className="text-blue-100">
              Fill in your details to schedule your solar consultation
            </DialogDescription>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div 
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    currentStep === step 
                      ? 'bg-yellow-500 text-white' 
                      : currentStep > step 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {currentStep > step ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-500">
                  {step === 1 ? 'Basics' : step === 2 ? 'Contact' : 'Interests'}
                </span>
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4">
            <div 
              className="bg-yellow-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); goToNextStep(); }} className="px-6 pb-6">
          {renderStepContent()}
          
          <div className="flex justify-between mt-6 space-x-3">
            {currentStep > 1 && (
              <Button
                type="button"
                onClick={goToPrevStep}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-all duration-300"
              >
                Back
              </Button>
            )}
            
            <Button
              type={currentStep === 3 ? "submit" : "button"}
              onClick={currentStep === 3 ? undefined : goToNextStep}
              disabled={!isStepValid() || (currentStep === 3 && isSubmitting)}
              className={`flex-1 ${currentStep < 3 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'} text-white font-semibold py-2.5 rounded-lg shadow-md transition-all duration-300`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : currentStep < 3 ? 'Continue' : buttonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
