import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Mock cart data
const cartItems = [
  { id: 1, name: "Pizza Margherita", price: 450, quantity: 1, store: "Pizza Express" },
  { id: 2, name: "Coca-Cola 1.5L", price: 85, quantity: 2, store: "Pizza Express" },
];

export default function Cart() {
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryFee = 75;
  const total = subtotal + deliveryFee;

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-fade-in">
        <div className="p-6 bg-muted rounded-full mb-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Carrinho Vazio</h2>
        <p className="text-muted-foreground text-center text-sm">
          Adicione itens ao carrinho para fazer um pedido
        </p>
        <Button className="mt-6 rounded-full" onClick={() => window.history.back()}>
          Explorar Restaurantes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      <h1 className="text-2xl font-bold">Meu Carrinho</h1>

      {/* Cart Items */}
      <div className="bg-card rounded-xl border border-border divide-y divide-border">
        {cartItems.map((item) => (
          <div key={item.id} className="p-4 flex gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-food/20 to-food/5 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-medium text-sm">{item.name}</h3>
              <p className="text-xs text-muted-foreground">{item.store}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-food">{item.price} MZN</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-medium">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full">
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
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
            <span className="text-muted-foreground">Subtotal</span>
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
      <Button size="lg" className="w-full rounded-xl h-12 text-base font-semibold">
        Finalizar Pedido • {total} MZN
      </Button>
    </div>
  );
}
