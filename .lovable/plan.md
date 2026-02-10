

## Plano: Corrigir Carrinho, Checkout, Pedidos e Tracking

### Problemas Identificados

1. **Carrinho - taxa de entrega inconsistente**: O carrinho mostra 75 MZN de taxa, mas o checkout usa 50 MZN. Deveria usar a taxa da loja (`store.delivery_fee`).

2. **Checkout - perfil do utilizador nao criado**: Ao criar um pedido, nao ha garantia de que o perfil do utilizador existe na tabela `profiles`. Isso causa falhas quando o OrderTracking tenta buscar dados do perfil.

3. **Orders - RLS no SELECT usa role `public`**: As politicas de SELECT para `orders` e `order_items` usam `roles: {public}` (anon), mas a query exige `auth.uid()`. Isto funciona para utilizadores autenticados, mas seria mais correcto usar `authenticated`.

4. **OrderTracking - driver_assignments nao visivel**: A politica RLS de SELECT para `driver_assignments` usa `roles: {authenticated}`, o que esta correcto. Porem, o `fetchDriver` faz uma query separada ao `profiles` que falha porque a politica de `profiles` so permite ver o proprio perfil (`auth.uid() = user_id`), impedindo o cliente de ver o nome/telefone do entregador.

5. **Falta de criacao automatica de perfil**: Nao existe trigger para criar um perfil automaticamente ao registar, o que pode causar falhas em cascata.

6. **CouponInput usa `.single()` em vez de `.maybeSingle()`**: Pode lancar erro se o cupom nao existir.

---

### Alteracoes Planeadas

#### 1. Migracao SQL (Backend)
- Criar trigger `on_auth_user_created` para criar automaticamente um registo em `profiles` quando um utilizador se regista.
- Adicionar politica RLS em `profiles` para permitir que utilizadores autenticados vejam o `full_name`, `phone` e `vehicle_type` de outros perfis (necessario para ver dados do entregador). Alternativa: criar uma view publica com campos limitados.
- Adicionar publicacao realtime para a tabela `orders` (se nao estiver ja).

#### 2. Carrinho (`src/pages/Cart.tsx`)
- Remover taxa de entrega fixa (75 MZN) do carrinho - mostrar apenas o subtotal.
- Indicar que a taxa sera calculada no checkout.

#### 3. Checkout (`src/pages/Checkout.tsx`)
- Usar a taxa de entrega real da loja (buscar `stores.delivery_fee` pelo `currentStoreId`).
- Garantir que o perfil do utilizador existe antes de criar o pedido.

#### 4. Pedidos (`src/pages/Orders.tsx`)
- Nenhuma alteracao critica necessaria - ja funciona com as correcoes anteriores.

#### 5. CouponInput (`src/components/checkout/CouponInput.tsx`)
- Substituir `.single()` por `.maybeSingle()` para evitar erro quando cupom nao existe.

#### 6. OrderTracking (`src/pages/OrderTracking.tsx`)
- Ajustar a query do motorista para funcionar com a nova politica de perfis.

---

### Secao Tecnica

**Ficheiros a modificar:**
- `src/pages/Cart.tsx` - remover taxa fixa, mostrar subtotal
- `src/pages/Checkout.tsx` - buscar delivery_fee da loja, garantir perfil
- `src/components/checkout/CouponInput.tsx` - `.single()` -> `.maybeSingle()`
- `src/pages/OrderTracking.tsx` - ajustar fetch do perfil do motorista

**Migracao SQL:**
- Trigger `handle_new_user` para criar perfil automaticamente
- Politica RLS adicional em `profiles`: SELECT para `authenticated` com campos limitados (via view ou politica permissiva para leitura basica)
- Verificar `supabase_realtime` para tabela `orders`

**Sequencia de execucao:**
1. Executar migracao SQL (trigger + politicas)
2. Corrigir CouponInput (`.maybeSingle()`)
3. Corrigir Cart (remover taxa fixa)
4. Corrigir Checkout (taxa dinamica + perfil)
5. Ajustar OrderTracking (perfil do motorista)

