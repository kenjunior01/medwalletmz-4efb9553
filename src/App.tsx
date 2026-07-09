import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CountryProvider } from "@/contexts/CountryContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { DataSaverProvider } from "@/contexts/DataSaverContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Main Pages
import Home from "./pages/Home";
import Pharmacy from "./pages/Pharmacy";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import StoreDetail from "./pages/StoreDetail";
import Checkout from "./pages/Checkout";
import Addresses from "./pages/Addresses";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import RoleSelection from "./pages/RoleSelection";
import Rewards from "./pages/Rewards";
import OrderTracking from "./pages/OrderTracking";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminStores from "./pages/admin/AdminStores";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminReports from "./pages/admin/AdminReports";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminSettings from "./pages/admin/AdminSettings";

// Store Owner Pages
import StoreOwnerDashboard from "./pages/store/StoreOwnerDashboard";
import StoreOwnerRegister from "./pages/store/StoreOwnerRegister";
import StoreHome from "./pages/store/StoreHome";
import StoreProducts from "./pages/store/StoreProducts";
import StoreOrders from "./pages/store/StoreOrders";
import StoreSettings from "./pages/store/StoreSettings";
import StoreReports from "./pages/store/StoreReports";

// Driver Pages
import DriverDashboard from "./pages/driver/DriverDashboard";
import DriverRegister from "./pages/driver/DriverRegister";
import DriverHistory from "./pages/driver/DriverHistory";

// Health Pages
import Doctors from "./pages/health/Doctors";
import BookConsultation from "./pages/health/BookConsultation";
import MyConsultations from "./pages/health/MyConsultations";
import ConsultationChat from "./pages/health/ConsultationChat";
import HealthProfile from "./pages/health/HealthProfile";
import DoctorRegister from "./pages/doctor/DoctorRegister";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorPatients from "./pages/doctor/DoctorPatients";
import CreatePrescription from "./pages/doctor/CreatePrescription";
import DoctorAvailability from "./pages/doctor/DoctorAvailability";
import MyPrescriptions from "./pages/health/MyPrescriptions";
import PrescriptionDetail from "./pages/health/PrescriptionDetail";
import HealthPlans from "./pages/health/HealthPlans";
import Subscribe from "./pages/subscribe/Subscribe";
import SubscribePlans from "./pages/subscribe/SubscribePlans";
import MySubscriptions from "./pages/MySubscriptions";
import ClinicRegister from "./pages/clinic/ClinicRegister";
import ClinicDashboard from "./pages/clinic/ClinicDashboard";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSubscriptionPlans from "./pages/admin/AdminSubscriptionPlans";
import AdminPaymentAccounts from "./pages/admin/AdminPaymentAccounts";
import PaymentSettings from "./pages/PaymentSettings";
import Triage from "./pages/health/Triage";
import MedicalRecords from "./pages/health/MedicalRecords";
import Exams from "./pages/health/Exams";
import HealthEducation from "./pages/health/HealthEducation";
import Partners from "./pages/Partners";
import WaitlistDialog from "@/components/providers/WaitlistDialog";
import VideoConsultation from "./pages/health/VideoConsultation";
import ConsultationRoom from "./pages/health/ConsultationRoom";
import VideoSessions from "./pages/health/VideoSessions";
import Referrals from "./pages/Referrals";
import Wallet from "./pages/Wallet";
import Legal from "./pages/Legal";
import AdminWallets from "./pages/admin/AdminWallets";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminPlatformSettings from "./pages/admin/AdminPlatformSettings";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminImport from "./pages/admin/AdminImport";
import AdminCuration from "./pages/admin/AdminCuration";
import GlobalMetrics from "./pages/admin/GlobalMetrics";
import FinancialDashboard from "./pages/admin/FinancialDashboard";
import CountrySettings from "./pages/admin/CountrySettings";
import AdminBootstrap from "./pages/AdminBootstrap";
import SuggestPlace from "./pages/SuggestPlace";
import AdminInsurance from "./pages/admin/AdminInsurance";
import Insurance from "./pages/insurance/Insurance";
import InsuranceDetail from "./pages/insurance/InsuranceDetail";
import InsuranceRegister from "./pages/insurance/InsuranceRegister";
import InsuranceDashboard from "./pages/insurance/InsuranceDashboard";
import Ads from "./pages/ads/Ads";
import AdForm from "./pages/ads/AdForm";
import MyAds from "./pages/ads/MyAds";
import Facilities from "./pages/health/Facilities";
import FacilityDetail from "./pages/health/FacilityDetail";
import LabDetail from "./pages/health/LabDetail";
import MyLabOrders from "./pages/health/MyLabOrders";
import AdminAds from "./pages/admin/AdminAds";
import AdminLabs from "./pages/admin/AdminLabs";
import LabRegister from "./pages/lab/LabRegister";
import LabDashboard from "./pages/lab/LabDashboard";
import BloodHub from "./pages/blood/BloodHub";
import BloodDonorRegister from "./pages/blood/BloodDonorRegister";
import BloodRequestForm from "./pages/blood/BloodRequestForm";
import Solidarity from "./pages/Solidarity";
import { SmartEngagementPopUp } from "@/components/notifications/SmartEngagementPopUp";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <CountryProvider>
          <CartProvider>
            <DataSaverProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                <SmartEngagementPopUp />
                <Routes>
                  {/* Main App Routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/pharmacy" element={<Pharmacy />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/store/:id" element={<StoreDetail />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/addresses" element={<Addresses />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/rewards" element={<Rewards />} />
                    <Route path="/order/:id" element={<OrderTracking />} />
                    <Route path="/health/doctors" element={<Doctors />} />
                    <Route path="/health/book/:doctorId" element={<BookConsultation />} />
                    <Route path="/health/consultations" element={<MyConsultations />} />
                    <Route path="/health/sessions" element={<VideoSessions />} />
                    <Route path="/health/consultation/:id" element={<ConsultationChat />} />
                    <Route path="/health/profile" element={<HealthProfile />} />
                    <Route path="/health/prescriptions" element={<MyPrescriptions />} />
                    <Route path="/health/prescription/:id" element={<PrescriptionDetail />} />
                    <Route path="/health/plans" element={<HealthPlans />} />
                    <Route path="/subscribe" element={<SubscribePlans />} />
                    <Route path="/subscribe/:planId" element={<Subscribe />} />
                    <Route path="/subscriptions" element={<MySubscriptions />} />
                    <Route path="/payment-settings" element={<PaymentSettings />} />
                    <Route path="/health/triage" element={<Triage />} />
                    <Route path="/health/records" element={<MedicalRecords />} />
                    <Route path="/health/exams" element={<Exams />} />
                    <Route path="/health/exams/lab/:id" element={<LabDetail />} />
                    <Route path="/health/exams/my" element={<MyLabOrders />} />
                    <Route path="/health/education" element={<HealthEducation />} />
                    <Route path="/health/education/:slug" element={<HealthEducation />} />
                    <Route path="/partners" element={<Partners />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/suggest-place" element={<SuggestPlace />} />
                    <Route path="/health/insurance" element={<Insurance />} />
                    <Route path="/insurance/:id" element={<InsuranceDetail />} />
                    <Route path="/insurance/register" element={<InsuranceRegister />} />
                    <Route path="/insurance/dashboard" element={<InsuranceDashboard />} />
                    <Route path="/ads" element={<Ads />} />
                    <Route path="/ads/new" element={<AdForm />} />
                    <Route path="/ads/mine" element={<MyAds />} />
                    <Route path="/health/facilities" element={<Facilities />} />
                    <Route path="/health/facilities/:id" element={<FacilityDetail />} />
                    <Route path="/blood" element={<BloodHub />} />
                    <Route path="/blood/register-donor" element={<BloodDonorRegister />} />
                    <Route path="/blood/request" element={<BloodRequestForm />} />
                    <Route path="/solidarity" element={<Solidarity />} />
                  </Route>

                  {/* Rota protegida: destrava o primeiro admin (bootstrap) */}
                  <Route path="/admin/bootstrap" element={<AdminBootstrap />} />

                  {/* Auth */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/register" element={<RoleSelection />} />

                  {/* Vídeo-consulta (fullscreen, sem layout) */}
                  <Route path="/health/video/:id" element={<VideoConsultation />} />
                  <Route path="/health/room/:id" element={<ConsultationRoom />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />}>
                    <Route index element={<AdminHome />} />
                    <Route path="stores" element={<AdminStores />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="drivers" element={<AdminDrivers />} />
                    <Route path="subscriptions" element={<AdminSubscriptions />} />
                    <Route path="subscription-plans" element={<AdminSubscriptionPlans />} />
                    <Route path="payment-accounts" element={<AdminPaymentAccounts />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="wallets" element={<AdminWallets />} />
                    <Route path="commissions" element={<AdminCommissions />} />
                    <Route path="platform-settings" element={<AdminPlatformSettings />} />
                    <Route path="referrals" element={<AdminReferrals />} />
                    <Route path="transactions" element={<AdminTransactions />} />
                    <Route path="import" element={<AdminImport />} />
                    <Route path="curation" element={<AdminCuration />} />
                    <Route path="insurance" element={<AdminInsurance />} />
                    <Route path="ads" element={<AdminAds />} />
                    <Route path="labs" element={<AdminLabs />} />
                    <Route path="global-metrics" element={<GlobalMetrics />} />
                    <Route path="financial" element={<FinancialDashboard />} />
                    <Route path="country-settings" element={<CountrySettings />} />
                  </Route>

                  {/* Store Owner Routes */}
                  <Route path="/store/register" element={<StoreOwnerRegister />} />
                  <Route path="/store/dashboard" element={<StoreOwnerDashboard />}>
                    <Route index element={<StoreHome />} />
                    <Route path="products" element={<StoreProducts />} />
                    <Route path="orders" element={<StoreOrders />} />
                    <Route path="reports" element={<StoreReports />} />
                    <Route path="settings" element={<StoreSettings />} />
                  </Route>

                  {/* Driver Routes */}
                  <Route path="/driver/register" element={<DriverRegister />} />
                  <Route path="/driver/dashboard" element={<DriverDashboard />} />
                  <Route path="/driver/history" element={<DriverHistory />} />

                  {/* Doctor Routes */}
                  <Route path="/doctor/register" element={<DoctorRegister />} />
                  <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor/patients" element={<DoctorPatients />} />
                  <Route path="/doctor/prescription/new" element={<CreatePrescription />} />
                  <Route path="/doctor/availability" element={<DoctorAvailability />} />

                  {/* Clinic Routes */}
                  <Route path="/clinic/register" element={<ClinicRegister />} />
                  <Route path="/clinic/dashboard" element={<ClinicDashboard />} />

                  {/* Lab Routes */}
                  <Route path="/lab/register" element={<LabRegister />} />
                  <Route path="/lab/dashboard" element={<LabDashboard />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </DataSaverProvider>
        </CartProvider>
      </CountryProvider>
    </LocationProvider>
  </AuthProvider>
</QueryClientProvider>
);

export default App;
