import { lazy, Suspense } from "react";
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
import { LoadingScreen } from "@/components/layout/LoadingScreen";

// =========================================================================
// CODE-SPLITTING COM React.lazy
// =========================================================================
// Antes: 100+ páginas importadas estaticamente = bundle único de 3.7 MB
// Agora: cada página é um chunk separado carregado on-demand.
// Isto reduz o bundle inicial de ~3.7 MB para ~600 KB (gzip ~180 KB),
// melhorando drasticamente o tempo de carregamento em 3G/4G MZ.
// =========================================================================

// ---- Páginas críticas (carregadas imediatamente — não lazy) ----
// Home e Auth são a primeira coisa que o utilizador vê; mantê-las no bundle
// principal evita flash de loading no primeiro acesso.
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import RegistrationWizard from "./pages/RegistrationWizard";
import NotFound from "./pages/NotFound";

// ---- Páginas principais (lazy-loaded) ----
const Pharmacy = lazy(() => import("./pages/Pharmacy"));
const Cart = lazy(() => import("./pages/Cart"));
const Orders = lazy(() => import("./pages/Orders"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Profile = lazy(() => import("./pages/Profile"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Addresses = lazy(() => import("./pages/Addresses"));
const Help = lazy(() => import("./pages/Help"));
const Rewards = lazy(() => import("./pages/Rewards"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Settings = lazy(() => import("./pages/Settings"));

// ---- Admin Pages ----
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminStores = lazy(() => import("./pages/admin/AdminStores"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminDrivers = lazy(() => import("./pages/admin/AdminDrivers"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminChangePassword = lazy(() => import("./pages/admin/AdminChangePassword"));

// ---- Store Owner Pages ----
const StoreOwnerDashboard = lazy(() => import("./pages/store/StoreOwnerDashboard"));
const StoreHome = lazy(() => import("./pages/store/StoreHome"));
const StoreProducts = lazy(() => import("./pages/store/StoreProducts"));
const StoreOrders = lazy(() => import("./pages/store/StoreOrders"));
const StoreSettings = lazy(() => import("./pages/store/StoreSettings"));
const StoreReports = lazy(() => import("./pages/store/StoreReports"));

// ---- Driver Pages ----
const DriverDashboard = lazy(() => import("./pages/driver/DriverDashboard"));
const DriverHistory = lazy(() => import("./pages/driver/DriverHistory"));

// ---- Health Pages ----
const Doctors = lazy(() => import("./pages/health/Doctors"));
const BookConsultation = lazy(() => import("./pages/health/BookConsultation"));
const MyConsultations = lazy(() => import("./pages/health/MyConsultations"));
const ConsultationChat = lazy(() => import("./pages/health/ConsultationChat"));
const HealthProfile = lazy(() => import("./pages/health/HealthProfile"));
const DoctorDashboard = lazy(() => import("./pages/doctor/DoctorDashboard"));
const DoctorPatients = lazy(() => import("./pages/doctor/DoctorPatients"));
const CreatePrescription = lazy(() => import("./pages/doctor/CreatePrescription"));
const DoctorAvailability = lazy(() => import("./pages/doctor/DoctorAvailability"));
const MyPrescriptions = lazy(() => import("./pages/health/MyPrescriptions"));
const PrescriptionDetail = lazy(() => import("./pages/health/PrescriptionDetail"));
const HealthPlans = lazy(() => import("./pages/health/HealthPlans"));
const Subscribe = lazy(() => import("./pages/subscribe/Subscribe"));
const SubscribePlans = lazy(() => import("./pages/subscribe/SubscribePlans"));
const MySubscriptions = lazy(() => import("./pages/MySubscriptions"));
const ClinicDashboard = lazy(() => import("./pages/clinic/ClinicDashboard"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminSubscriptionPlans = lazy(() => import("./pages/admin/AdminSubscriptionPlans"));
const AdminPaymentAccounts = lazy(() => import("./pages/admin/AdminPaymentAccounts"));
const PaymentSettings = lazy(() => import("./pages/PaymentSettings"));
const Triage = lazy(() => import("./pages/health/Triage"));
const MedicalRecords = lazy(() => import("./pages/health/MedicalRecords"));
const Exams = lazy(() => import("./pages/health/Exams"));
const HealthEducation = lazy(() => import("./pages/health/HealthEducation"));
const Partners = lazy(() => import("./pages/Partners"));
const VideoConsultation = lazy(() => import("./pages/health/VideoConsultation"));
const ConsultationRoom = lazy(() => import("./pages/health/ConsultationRoom"));
const VideoSessions = lazy(() => import("./pages/health/VideoSessions"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Legal = lazy(() => import("./pages/Legal"));
const AdminWallets = lazy(() => import("./pages/admin/AdminWallets"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminPlatformSettings = lazy(() => import("./pages/admin/AdminPlatformSettings"));
const AdminReferrals = lazy(() => import("./pages/admin/AdminReferrals"));
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"));
const AdminImport = lazy(() => import("./pages/admin/AdminImport"));
const AdminCuration = lazy(() => import("./pages/admin/AdminCuration"));
const AdminInstitutions = lazy(() => import("./pages/admin/AdminInstitutions"));
const GlobalMetrics = lazy(() => import("./pages/admin/GlobalMetrics"));
const GlobalCommandCenter = lazy(() => import("./pages/admin/GlobalCommandCenter"));
const FinancialDashboard = lazy(() => import("./pages/admin/FinancialDashboard"));
const CountrySettings = lazy(() => import("./pages/admin/CountrySettings"));
const CountryDashboard = lazy(() => import("./pages/admin/CountryDashboard"));
const RegionalOnboarding = lazy(() => import("./pages/admin/RegionalOnboarding"));
const RegionalManagerDashboard = lazy(() => import("./pages/admin/RegionalManagerDashboard"));
const ComplianceCommandCenter = lazy(() => import("./pages/admin/ComplianceCommandCenter"));
const PartnerVerification = lazy(() => import("./pages/admin/PartnerVerification"));
const DocumentVault = lazy(() => import("./pages/admin/DocumentVault"));
const AuditTrail = lazy(() => import("./pages/admin/AuditTrail"));
const MicroInsurance = lazy(() => import("./pages/admin/MicroInsurance"));
const RegulatoryFrameworks = lazy(() => import("./pages/admin/RegulatoryFrameworks"));
const MeddyCopilot = lazy(() => import("./pages/admin/MeddyCopilot"));
const IndiaInstitutionsPage = lazy(() => import("./pages/admin/IndiaInstitutionsPage"));
const ApeDashboard = lazy(() => import("./pages/admin/ApeDashboard"));
const TbDotPage = lazy(() => import("./pages/admin/TbDotPage"));
const ArtAdherencePage = lazy(() => import("./pages/admin/ArtAdherencePage"));
const MalariaWorkflowPage = lazy(() => import("./pages/admin/MalariaWorkflowPage"));
const MaternalHealthPage = lazy(() => import("./pages/admin/MaternalHealthPage"));
const GoogleCloudHub = lazy(() => import("./pages/admin/GoogleCloudHub"));
const AdminBootstrap = lazy(() => import("./pages/AdminBootstrap"));
const SuggestPlace = lazy(() => import("./pages/SuggestPlace"));
const Veterinary = lazy(() => import("./pages/health/Veterinary"));
const AdminInsurance = lazy(() => import("./pages/admin/AdminInsurance"));
const Insurance = lazy(() => import("./pages/insurance/Insurance"));
const InsuranceDetail = lazy(() => import("./pages/insurance/InsuranceDetail"));
const InsuranceDashboard = lazy(() => import("./pages/insurance/InsuranceDashboard"));
const Ads = lazy(() => import("./pages/ads/Ads"));
const AdForm = lazy(() => import("./pages/ads/AdForm"));
const MyAds = lazy(() => import("./pages/ads/MyAds"));
const Facilities = lazy(() => import("./pages/health/Facilities"));
const FacilityExplorer = lazy(() => import("./pages/health/FacilityExplorer"));
const FacilityDetail = lazy(() => import("./pages/health/FacilityDetail"));
const LegalDocs = lazy(() => import("./pages/LegalDocs"));
const LabDetail = lazy(() => import("./pages/health/LabDetail"));
const MyLabOrders = lazy(() => import("./pages/health/MyLabOrders"));
const AdminAds = lazy(() => import("./pages/admin/AdminAds"));
const AdminLabs = lazy(() => import("./pages/admin/AdminLabs"));
const AdminClinics = lazy(() => import("./pages/admin/AdminClinics"));
const LabDashboard = lazy(() => import("./pages/lab/LabDashboard"));
const BloodHub = lazy(() => import("./pages/blood/BloodHub"));
const BloodDonorRegister = lazy(() => import("./pages/blood/BloodDonorRegister"));
const BloodRequestForm = lazy(() => import("./pages/blood/BloodRequestForm"));
const Solidarity = lazy(() => import("./pages/Solidarity"));
const MzPricingPlans = lazy(() => import("./pages/MzPricingPlans"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const MzB2BPlans = lazy(() => import("./pages/MzB2BPlans"));
const MonetizationHub = lazy(() => import("./pages/MonetizationHub"));
const AdminMonetization = lazy(() => import("./pages/admin/AdminMonetization"));
const HealthEducationHub = lazy(() => import("./pages/health/edu/HealthEducationHub"));
const PublicImpactDashboard = lazy(() => import("./pages/PublicImpactDashboard"));
const ApeNetwork = lazy(() => import("./pages/ApeNetwork"));

// =========================================================================
// QueryClient com cache optimizado
// =========================================================================
// Antes: `new QueryClient()` sem defaults = sempre refetch, sem cache útil
// Agora:
//   - staleTime 60s: dados frescos por 1 min (evita refetch em navegação)
//   - gcTime 5 min: cache mantido 5 min após desmontar (reutilização rápida)
//   - retry 2 com backoff exponencial
//   - refetchOnWindowFocus false: não refetch ao voltar à aba
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // 1 min
      gcTime: 5 * 60 * 1000,        // 5 min
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

// Initializing the app
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
                <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Main App Routes */}
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/auth/oauth/consent" element={<OAuthConsent />} />
                    <Route path="/pharmacy" element={<Pharmacy />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/store/:id" element={<StoreDetail />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/addresses" element={<Addresses />} />
                    <Route path="/settings" element={<Settings />} />
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
                    <Route path="/health/veterinary" element={<Veterinary />} />
                    <Route path="/partners" element={<Partners />} />
                    <Route path="/referrals" element={<Referrals />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/legal/:type" element={<LegalDocs />} />
                    <Route path="/suggest-place" element={<SuggestPlace />} />
                    <Route path="/health/insurance" element={<Insurance />} />
                    <Route path="/insurance/:id" element={<InsuranceDetail />} />
                    <Route path="/insurance/register" element={<RegistrationWizard />} />
                    <Route path="/insurance/dashboard" element={<InsuranceDashboard />} />
                    <Route path="/ads" element={<Ads />} />
                    <Route path="/ads/new" element={<AdForm />} />
                    <Route path="/ads/mine" element={<MyAds />} />
                    <Route path="/health/facilities" element={<Facilities />} />
                    <Route path="/health/explorer" element={<FacilityExplorer />} />
                    <Route path="/health/facilities/:id" element={<FacilityDetail />} />
                    <Route path="/blood" element={<BloodHub />} />
                    <Route path="/blood/register-donor" element={<BloodDonorRegister />} />
                    <Route path="/blood/request" element={<BloodRequestForm />} />
                    <Route path="/solidarity" element={<Solidarity />} />
                    <Route path="/planos" element={<MzPricingPlans />} />
                    <Route path="/planos-b2b" element={<MzB2BPlans />} />
                    <Route path="/notifications-center" element={<NotificationCenter />} />
                    <Route path="/monetizacao" element={<MonetizationHub />} />
                    <Route path="/educacao" element={<HealthEducationHub />} />
                    <Route path="/impacto" element={<PublicImpactDashboard />} />
                    <Route path="/rede-ape" element={<ApeNetwork />} />
                  </Route>

                  {/* Rota protegida: destrava o primeiro admin (bootstrap) */}
                  <Route path="/admin/bootstrap" element={<AdminBootstrap />} />

                  {/* Auth */}
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/register" element={<RegistrationWizard />} />

                  {/* Vídeo-consulta (fullscreen, sem layout) */}
                  <Route path="/health/video/:id" element={<VideoConsultation />} />
                  <Route path="/health/room/:id" element={<ConsultationRoom />} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />}>
                    <Route index element={<AdminHome />} />
                    <Route path="stores" element={<AdminStores />} />
                    <Route path="clinics" element={<AdminClinics />} />
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
                    <Route path="change-password" element={<AdminChangePassword />} />
                    <Route path="wallets" element={<AdminWallets />} />
                    <Route path="commissions" element={<AdminCommissions />} />
                    <Route path="monetization" element={<AdminMonetization />} />
                    <Route path="platform-settings" element={<AdminPlatformSettings />} />
                    <Route path="referrals" element={<AdminReferrals />} />
                    <Route path="transactions" element={<AdminTransactions />} />
                    <Route path="import" element={<AdminImport />} />
                    <Route path="curation" element={<AdminCuration />} />
                    <Route path="institutions" element={<AdminInstitutions />} />
                    <Route path="insurance" element={<AdminInsurance />} />
                    <Route path="ads" element={<AdminAds />} />
                    <Route path="labs" element={<AdminLabs />} />
                    <Route path="global-metrics" element={<GlobalMetrics />} />
                    <Route path="global-command" element={<GlobalCommandCenter />} />
                    <Route path="financial" element={<FinancialDashboard />} />
                    <Route path="country-settings" element={<CountrySettings />} />
                    <Route path="country-dashboard" element={<CountryDashboard />} />
                    <Route path="regional-onboarding" element={<RegionalOnboarding />} />
                    <Route path="compliance" element={<ComplianceCommandCenter />} />
                    <Route path="compliance/partners" element={<PartnerVerification />} />
                    <Route path="compliance/documents" element={<DocumentVault />} />
                    <Route path="compliance/audit" element={<AuditTrail />} />
                    <Route path="compliance/insurance" element={<MicroInsurance />} />
                    <Route path="compliance/frameworks" element={<RegulatoryFrameworks />} />
                    <Route path="compliance/copilot" element={<MeddyCopilot />} />
                    <Route path="india" element={<IndiaInstitutionsPage />} />
                    <Route path="mz-verticals/ape" element={<ApeDashboard />} />
                    <Route path="mz-verticals/tb-dot" element={<TbDotPage />} />
                    <Route path="mz-verticals/art" element={<ArtAdherencePage />} />
                    <Route path="mz-verticals/malaria" element={<MalariaWorkflowPage />} />
                    <Route path="mz-verticals/maternal" element={<MaternalHealthPage />} />
                    <Route path="google-cloud" element={<GoogleCloudHub />} />
                  </Route>

                  {/* Regional Manager Routes */}
                  <Route path="/manager" element={<RegionalManagerDashboard />}>
                    <Route index element={<CountryDashboard />} />
                    <Route path="curation" element={<AdminCuration />} />
                    <Route path="institutions" element={<AdminInstitutions />} />
                    <Route path="stores" element={<AdminStores />} />
                    <Route path="clinics" element={<AdminClinics />} />
                    <Route path="veterinary" element={<AdminClinics />} />
                    <Route path="labs" element={<AdminLabs />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="drivers" element={<AdminDrivers />} />
                    <Route path="insurance" element={<AdminInsurance />} />
                    <Route path="ads" element={<AdminAds />} />
                    <Route path="reports" element={<AdminReports />} />
                    <Route path="import" element={<AdminImport />} />
                    <Route path="compliance" element={<ComplianceCommandCenter />} />
                    <Route path="compliance/partners" element={<PartnerVerification />} />
                    <Route path="compliance/documents" element={<DocumentVault />} />
                    <Route path="compliance/audit" element={<AuditTrail />} />
                    <Route path="compliance/insurance" element={<MicroInsurance />} />
                    <Route path="compliance/frameworks" element={<RegulatoryFrameworks />} />
                    <Route path="compliance/copilot" element={<MeddyCopilot />} />
                    <Route path="india" element={<IndiaInstitutionsPage />} />
                    <Route path="mz-verticals/ape" element={<ApeDashboard />} />
                    <Route path="mz-verticals/tb-dot" element={<TbDotPage />} />
                    <Route path="mz-verticals/art" element={<ArtAdherencePage />} />
                    <Route path="mz-verticals/malaria" element={<MalariaWorkflowPage />} />
                    <Route path="mz-verticals/maternal" element={<MaternalHealthPage />} />
                    <Route path="google-cloud" element={<GoogleCloudHub />} />
                  </Route>

                  {/* Store Owner Routes */}
                  <Route path="/store/register" element={<RegistrationWizard />} />
                  <Route path="/pharmacy/register" element={<RegistrationWizard />} />
                  <Route path="/store/dashboard" element={<StoreOwnerDashboard />}>
                    <Route index element={<StoreHome />} />
                    <Route path="products" element={<StoreProducts />} />
                    <Route path="orders" element={<StoreOrders />} />
                    <Route path="reports" element={<StoreReports />} />
                    <Route path="settings" element={<StoreSettings />} />
                  </Route>

                  {/* Driver Routes */}
                  <Route path="/driver/register" element={<RegistrationWizard />} />
                  <Route path="/driver/dashboard" element={<DriverDashboard />} />
                  <Route path="/driver/history" element={<DriverHistory />} />

                  {/* Doctor Routes */}
                  <Route path="/doctor/register" element={<RegistrationWizard />} />
                  <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor/patients" element={<DoctorPatients />} />
                  <Route path="/doctor/prescription/new" element={<CreatePrescription />} />
                  <Route path="/doctor/availability" element={<DoctorAvailability />} />

                  {/* Clinic Routes */}
                  <Route path="/clinic/register" element={<RegistrationWizard />} />
                  <Route path="/hospital/register" element={<RegistrationWizard />} />
                  <Route path="/clinic/dashboard" element={<ClinicDashboard />} />

                  {/* Lab Routes */}
                  <Route path="/lab/register" element={<RegistrationWizard />} />
                  <Route path="/lab/dashboard" element={<LabDashboard />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
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
