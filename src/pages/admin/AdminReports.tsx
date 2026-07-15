import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, ShoppingBag, Store, Users, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";

interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
}

interface StoreStats {
  name: string;
  orders: number;
  revenue: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#8b5cf6"];

export default function AdminReports() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const { country } = useCountry();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalStores: 0,
    totalUsers: 0,
    avgOrderValue: 0,
  });
  const [dailyData, setDailyData] = useState<DailyStats[]>([]);
  const [storeData, setStoreData] = useState<StoreStats[]>([]);
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([]);

  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("country_manager");

  useEffect(() => {
    if (!user || (!isAdmin && !isManager)) {
      navigate("/admin");
      return;
    }
    fetchStats();
  }, [user, isAdmin, isManager, period, country?.id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const days = parseInt(period);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // Fetch orders within period, filtered by country if context exists
      let query: any = supabase
        .from("orders")
        .select("id, total, status, created_at, store_id, stores(name)")
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (country?.id) {
        query = query.eq('country_id', country.id);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      // Fetch total counts filtered by country
      const storesQuery: any = supabase.from("stores").select("id", { count: "exact", head: true });
      const ordersCountQuery: any = supabase.from("orders").select("id", { count: "exact", head: true });
      const usersQuery: any = supabase.from("profiles").select("id", { count: "exact", head: true });

      if (country?.id) {
        storesQuery.eq('country_id', country.id);
        ordersCountQuery.eq('country_id', country.id);
        usersQuery.eq('country_id', country.id);
      }

      const [storesRes, ordersCountRes, usersRes] = await Promise.all([
        storesQuery,
        ordersCountQuery,
        usersQuery
      ]);

      // Calculate stats
      const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
      const totalOrders = orders?.length || 0;

      setStats({
        totalOrders: ordersCountRes.count || 0,
        totalRevenue,
        totalStores: storesRes.count || 0,
        totalUsers: usersRes.count || 0,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      });

      // Daily breakdown
      const dailyMap = new Map<string, { orders: number; revenue: number }>();
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "dd/MM");
        dailyMap.set(date, { orders: 0, revenue: 0 });
      }

      orders?.forEach((order) => {
        const date = format(new Date(order.created_at), "dd/MM");
        const existing = dailyMap.get(date) || { orders: 0, revenue: 0 };
        dailyMap.set(date, {
          orders: existing.orders + 1,
          revenue: existing.revenue + order.total,
        });
      });

      setDailyData(
        Array.from(dailyMap.entries()).map(([date, data]) => ({
          date,
          orders: data.orders,
          revenue: data.revenue,
        }))
      );

      // Store breakdown
      const storeMap = new Map<string, { orders: number; revenue: number }>();
      orders?.forEach((order) => {
        const storeName = (order.stores as any)?.name || "Desconhecida";
        const existing = storeMap.get(storeName) || { orders: 0, revenue: 0 };
        storeMap.set(storeName, {
          orders: existing.orders + 1,
          revenue: existing.revenue + order.total,
        });
      });

      setStoreData(
        Array.from(storeMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      );

      // Status breakdown
      const statusMap = new Map<string, number>();
      orders?.forEach((order) => {
        const count = statusMap.get(order.status) || 0;
        statusMap.set(order.status, count + 1);
      });

      const statusLabels: Record<string, string> = {
        pending: "Pendente",
        confirmed: "Confirmado",
        preparing: "Preparando",
        ready: "Pronto",
        in_transit: "A Caminho",
        delivered: "Entregue",
        cancelled: "Cancelado",
      };

      setStatusData(
        Array.from(statusMap.entries()).map(([status, value]) => ({
          name: statusLabels[status] || status,
          value,
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => `${value.toLocaleString()} MZN`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Relatórios</h1>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Pedidos</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">Receita Total</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-4 w-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Farmácias Ativas</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalStores}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Utilizadores</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-xs text-muted-foreground">Ticket Médio</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pedidos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--secondary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Stores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Farmácias por Receita</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : storeData.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">
                Nenhum dado disponível
              </p>
            ) : (
              <div className="space-y-3">
                {storeData.map((store, index) => (
                  <div key={store.name} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{store.name}</p>
                      <p className="text-xs text-muted-foreground">{store.orders} pedidos</p>
                    </div>
                    <span className="font-bold text-sm">{formatCurrency(store.revenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
