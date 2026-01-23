import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { LocationProvider } from "@/contexts/LocationContext";
import { AppLayout } from "@/components/layout/AppLayout";
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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminStores from "./pages/admin/AdminStores";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
import NotFound from "./pages/NotFound";

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
                </Route>
                
                {/* Auth */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />}>
                  <Route index element={<AdminHome />} />
                  <Route path="stores" element={<AdminStores />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                </Route>
                
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
