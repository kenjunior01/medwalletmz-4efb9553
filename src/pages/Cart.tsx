import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCart();
  
  // Delivery fee is calculated at checkout based on the store

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Carrinho Vazio</h2>
        <p className="text-muted-foreground text-center text-sm">
          Adicione itens ao carrinho para fazer um pedido
        </p>
        <Button className="mt-6 rounded-full" onClick={() => navigate("/food")}>
          Explorar Restaurantes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-28 animate-fade-in">
      <h1 className="text-2xl font-bold">Meu Carrinho</h1>
      
      {/* Store info */}
      {items[0]?.store_name && (
        <p className="text-sm text-muted-foreground">
          Pedindo de: <span className="font-medium text-foreground">{items[0].store_name}</span>
        </p>
      )}

      {/* Cart Items */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="p-4 flex gap-3">
            {item.image_url ? (
              <img 
                src={item.image_url} 
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-food/20 to-food/5 rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{item.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{item.store_name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-food">{item.price} MZN</span>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-full"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-medium">{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-7 w-7 rounded-full"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-semibold">Resumo do Pedido</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
            <span>{subtotal} MZN</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa de Entrega</span>
            <span>{deliveryFee} MZN</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{total} MZN</span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <Button 
          size="lg" 
          className="w-full rounded-xl h-12 text-base font-semibold"
          onClick={() => navigate("/checkout")}
        >
          Finalizar Pedido • {total} MZN
        </Button>
      </div>
    </div>
  );
}
