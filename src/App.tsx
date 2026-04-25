import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ClinicLayout from "./components/clinic/ClinicLayout";

const Landing = lazy(() => import("./pages/Landing"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Login = lazy(() => import("./pages/Login"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Legal = lazy(() => import("./pages/Legal"));
const Dashboard = lazy(() => import("./pages/clinic/Dashboard"));
const Patients = lazy(() => import("./pages/clinic/Patients"));
const WaitingRoom = lazy(() => import("./pages/clinic/WaitingRoom"));
const Appointments = lazy(() => import("./pages/clinic/Appointments"));
const Invoices = lazy(() => import("./pages/clinic/Invoices"));
const Reports = lazy(() => import("./pages/clinic/Reports"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Anamnesis = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.Anamnesis })));
const Diagnoses = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.Diagnoses })));
const TreatmentPlans = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.TreatmentPlans })));
const Sessions = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.Sessions })));
const Offers = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.Offers })));
const Staff = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.Staff })));
const Settings = lazy(() => import("./pages/clinic/Simple").then((module) => ({ default: module.Settings })));

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center text-sm text-slate-500">
    Loading workspace...
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry(failureCount, error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (message.includes("unauthorized") || message.includes("forbidden")) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => (
  <ThemeProvider defaultTheme="light">
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/checkout" element={<Checkout />} />
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
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
