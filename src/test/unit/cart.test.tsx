import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from '@/contexts/CartContext';

// ------------------------------------------------------------------
// Wrapper para testar hooks que dependem de Provider
// ------------------------------------------------------------------
function wrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ---- addItem ----
  describe('addItem', () => {
    it('deve adicionar um item ao carrinho vazio', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          id: 'prod-1',
          name: 'Paracetamol 500mg',
          price: 50,
          store_id: 'store-1',
          store_name: 'Farmácia Central',
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        id: 'prod-1',
        name: 'Paracetamol 500mg',
        price: 50,
        quantity: 1,
        store_id: 'store-1',
      });
      expect(result.current.totalItems).toBe(1);
      expect(result.current.subtotal).toBe(50);
    });

    it('deve incrementar quantidade ao adicionar item duplicado', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      const item = {
        id: 'prod-1',
        name: 'Paracetamol 500mg',
        price: 50,
        store_id: 'store-1',
      };

      act(() => { result.current.addItem(item); });
      act(() => { result.current.addItem(item); });
      act(() => { result.current.addItem(item); });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.totalItems).toBe(3);
      expect(result.current.subtotal).toBe(150);
    });

    it('deve limpar carrinho ao adicionar item de loja diferente', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({
          id: 'prod-1', name: 'Item A', price: 100, store_id: 'store-1',
        });
      });
      act(() => {
        result.current.addItem({
          id: 'prod-1', name: 'Item A', price: 100, store_id: 'store-1',
        });
      });

      // Adicionar de outra loja — deve limpar e adicionar só o novo
      act(() => {
        result.current.addItem({
          id: 'prod-2', name: 'Item B', price: 200, store_id: 'store-2',
        });
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].store_id).toBe('store-2');
      expect(result.current.subtotal).toBe(200);
    });
  });

  // ---- removeItem ----
  describe('removeItem', () => {
    it('deve remover um item existente', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 's1' });
        result.current.addItem({ id: 'b', name: 'B', price: 20, store_id: 's1' });
      });

      act(() => { result.current.removeItem('a'); });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].id).toBe('b');
    });

    it('não deve quebrar ao remover item inexistente', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 's1' });
      });

      // Não deve lançar erro
      act(() => { result.current.removeItem('nonexistent'); });
      expect(result.current.items).toHaveLength(1);
    });
  });

  // ---- updateQuantity ----
  describe('updateQuantity', () => {
    it('deve actualizar quantidade', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 's1' });
      });

      act(() => { result.current.updateQuantity('a', 5); });
      expect(result.current.items[0].quantity).toBe(5);
      expect(result.current.totalItems).toBe(5);
      expect(result.current.subtotal).toBe(50);
    });

    it('deve remover item quando quantidade <= 0', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 's1' });
      });

      act(() => { result.current.updateQuantity('a', 0); });
      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
    });
  });

  // ---- clearCart ----
  describe('clearCart', () => {
    it('deve limpar todos os itens', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 's1' });
        result.current.addItem({ id: 'b', name: 'B', price: 20, store_id: 's1' });
      });

      act(() => { result.current.clearCart(); });
      expect(result.current.items).toHaveLength(0);
      expect(result.current.totalItems).toBe(0);
      expect(result.current.subtotal).toBe(0);
      expect(result.current.currentStoreId).toBeNull();
    });
  });

  // ---- currentStoreId ----
  describe('currentStoreId', () => {
    it('deve ser null para carrinho vazio', () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.currentStoreId).toBeNull();
    });

    it('deve ser o store_id do primeiro item', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 'farmacia-123' });
      });

      expect(result.current.currentStoreId).toBe('farmacia-123');
    });
  });

  // ---- Persistência localStorage ----
  describe('persistência', () => {
    it('deve persistir carrinho no localStorage', () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      act(() => {
        result.current.addItem({ id: 'a', name: 'A', price: 10, store_id: 's1' });
      });

      const stored = JSON.parse(localStorage.getItem('cart')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('a');
    });

    it('deve lidar com dados corrompidos no localStorage', () => {
      localStorage.setItem('cart', 'not-valid-json');

      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(0);
    });

    it('deve lidar com array corrompido no localStorage', () => {
      localStorage.setItem('cart', '"just-a-string"');

      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(0);
    });
  });

  // ---- useCart sem provider ----
  it('deve lançar erro se useCart for usado sem CartProvider', async () => {
    // Importar dinamicamente para evitar erro em tempo de parse
    const { useCart } = await import('@/contexts/CartContext');
    expect(() => renderHook(() => useCart())).toThrow(
      'useCart must be used within a CartProvider'
    );
  });
});
