import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import Legal from "./pages/Legal";
import ClinicLayout from "./components/clinic/ClinicLayout";
import Dashboard from "./pages/clinic/Dashboard";
import Patients from "./pages/clinic/Patients";
import WaitingRoom from "./pages/clinic/WaitingRoom";
import Appointments from "./pages/clinic/Appointments";
import Invoices from "./pages/clinic/Invoices";
import Reports from "./pages/clinic/Reports";
import { Anamnesis, Diagnoses, TreatmentPlans, Sessions, Offers, Staff, Settings } from "./pages/clinic/Simple";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/legal/:doc" element={<Legal />} />
              <Route path="/legal" element={<Navigate to="/legal/terms" replace />} />

              {/* Super Admin */}
              <Route path="/Adminstaff" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />

              {/* Clinic */}
              <Route element={<ClinicLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/waiting-room" element={<WaitingRoom />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/anamnesis" element={<Anamnesis />} />
                <Route path="/diagnoses" element={<Diagnoses />} />
                <Route path="/treatment-plans" element={<TreatmentPlans />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
