import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import AdminGoogleAuth from "./components/AdminGoogleAuth";
import AdminGoogleAuthCallback from "./components/AdminGoogleAuthCallback";
import LeadBookingPage from "./pages/LeadBookingPage";
import BookingConfirmationPage from "./pages/BookingConfirmationPage";
import AdminRoutingLogsPage from "./pages/AdminRoutingLogsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import CalendarTest from "./pages/CalendarTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/book" replace />} />
          <Route path="/book" element={<LeadBookingPage />} />
          <Route path="/book-meeting/:designerId" element={<LeadBookingPage />} />
          <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
          
          {/* Google Auth Callback - matches the redirect URI in Google Cloud Console */}
          <Route path="/auth/callback" element={<AdminGoogleAuthCallback />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/google-auth" element={<AdminGoogleAuth />} />
          <Route path="/admin/google-auth-callback" element={<AdminGoogleAuthCallback />} />
          <Route path="/admin/routing-logs" element={<AdminRoutingLogsPage />} />
          <Route path="/admin/calendar-test" element={<CalendarTest />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
