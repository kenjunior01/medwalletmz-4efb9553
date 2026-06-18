import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Plus, Package, Pencil, Trash2, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;
type Store = Tables<"stores">;

interface ProductWithStore extends Product {
  store?: Store | null;
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();
  const [products, setProducts] = useState<ProductWithStore[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image_url: "",
    store_id: "",
    is_available: true,
  });

  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate("/admin");
      return;
    }
    fetchData();
  }, [user, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, storesRes] = await Promise.all([
        supabase
          .from("products")
          .select("*, store:stores(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("stores")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (storesRes.error) throw storesRes.error;

      setProducts((productsRes.data as ProductWithStore[]) || []);
      setStores(storesRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore = selectedStore === "all" || product.store_id === selectedStore;
    return matchesSearch && matchesStore;
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "",
      image_url: "",
      store_id: stores[0]?.id || "",
      is_available: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category: product.category || "",
      image_url: product.image_url || "",
      store_id: product.store_id,
      is_available: product.is_available ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.store_id) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseInt(formData.price),
        category: formData.category || null,
        image_url: formData.image_url || null,
        store_id: formData.store_id,
        is_available: formData.is_available,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;
        toast.success("Produto criado!");
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir "${product.name}"?`)) return;

    try {
      const { error } = await supabase.from("products").delete().eq("id", product.id);

      if (error) throw error;
      toast.success("Produto excluído!");
      fetchData();
    } catch (error) {
      console.error("Erro ao excluir produto:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_available: !product.is_available })
        .eq("id", product.id);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_available: !p.is_available } : p
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar disponibilidade:", error);
      toast.error("Erro ao atualizar");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Gestão de Produtos</h1>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Novo
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar produtos..."
              className="pl-10"
            />
          </div>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Farmácia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as farmácias</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold text-primary">{products.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold text-green-500">
              {products.filter((p) => p.is_available).length}
            </p>
            <p className="text-xs text-muted-foreground">Disponíveis</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-3 text-center">
            <p className="text-2xl font-bold text-red-500">
              {products.filter((p) => !p.is_available).length}
            </p>
            <p className="text-xs text-muted-foreground">Indisponíveis</p>
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-xl border border-border p-3 flex gap-3"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{product.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.store?.name || "Sem farmácia"}
                      </p>
                    </div>
                    <Badge variant={product.is_available ? "default" : "secondary"}>
                      {product.price} MZN
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.is_available ?? true}
                        onCheckedChange={() => toggleAvailability(product)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {product.is_available ? "Disponível" : "Indisponível"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do produto"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Farmácia *</label>
              <Select
                value={formData.store_id}
                onValueChange={(value) => setFormData({ ...formData, store_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma farmácia" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Preço (MZN) *</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Categoria</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Bebidas"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do produto"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">URL da Imagem</label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_available}
                onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
              />
              <span className="text-sm">Disponível para venda</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingProduct ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
