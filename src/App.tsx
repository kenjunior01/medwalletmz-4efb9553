import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Main Pages
import Home from "./pages/Home";
import FoodDelivery from "./pages/FoodDelivery";
import Grocery from "./pages/Grocery";
import Pharmacy from "./pages/Pharmacy";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Auth from "./pages/Auth";
import StoreDetail from "./pages/StoreDetail";
import Checkout from "./pages/Checkout";
import AIAssistant from "./pages/AIAssistant";
import Favorites from "./pages/Favorites";
import Addresses from "./pages/Addresses";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import RoleSelection from "./pages/RoleSelection";
import Rewards from "./pages/Rewards";
import Guide from "./pages/Guide";
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
import InfluencerDashboard from "./pages/influencer/InfluencerDashboard";

// Health Pages
import Doctors from "./pages/health/Doctors";
import BookConsultation from "./pages/health/BookConsultation";
import MyConsultations from "./pages/health/MyConsultations";
import ConsultationChat from "./pages/health/ConsultationChat";
import HealthProfile from "./pages/health/HealthProfile";
import DoctorRegister from "./pages/doctor/DoctorRegister";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import DoctorPatients from "./pages/doctor/DoctorPatients";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <LocationProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Main App Routes */}
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/food" element={<FoodDelivery />} />
                  <Route path="/grocery" element={<Grocery />} />
                  <Route path="/pharmacy" element={<Pharmacy />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/store/:id" element={<StoreDetail />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/ai" element={<AIAssistant />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/addresses" element={<Addresses />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/rewards" element={<Rewards />} />
                  <Route path="/guide" element={<Guide />} />
                  <Route path="/guide/:id" element={<Guide />} />
                  <Route path="/order/:id" element={<OrderTracking />} />
                  <Route path="/health/doctors" element={<Doctors />} />
                  <Route path="/health/book/:doctorId" element={<BookConsultation />} />
                  <Route path="/health/consultations" element={<MyConsultations />} />
                  <Route path="/health/consultation/:id" element={<ConsultationChat />} />
                  <Route path="/health/profile" element={<HealthProfile />} />
                </Route>
                
                {/* Auth */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/register" element={<RoleSelection />} />
                
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
                  <Route path="settings" element={<AdminSettings />} />
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
                <Route path="/influencer/dashboard" element={<InfluencerDashboard />} />

                {/* Doctor Routes */}
                <Route path="/doctor/register" element={<DoctorRegister />} />
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                <Route path="/doctor/patients" element={<DoctorPatients />} />
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LocationProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
