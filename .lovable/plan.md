

## Plano: Corrigir Carrinho/Pedidos + Funcionalidades para Influenciadores

Analisei o PDF da estrategia de parcerias com influenciadores e o estado actual do codigo. Ha dois blocos de trabalho: corrigir os bugs existentes e implementar as funcionalidades pedidas no documento.

---

### Parte 1: Correcoes Criticas (Carrinho, Checkout, Pedidos, Tracking)

**Problemas encontrados:**

1. **Trigger `handle_new_user` nao esta ligado** -- a funcao existe mas nao ha trigger em `auth.users`, entao perfis nao sao criados automaticamente no registo. Isto causa falhas em cascata.

2. **Perfis de motoristas invisiveis** -- RLS de `profiles` so permite ver o proprio perfil. O cliente nao consegue ver nome/telefone do entregador no tracking.

3. **Taxa de entrega fixa no carrinho (75 MZN)** e no checkout (50 MZN) -- deveria usar `stores.delivery_fee`.

4. **CouponInput usa `.single()`** -- lanca erro se o cupom nao for encontrado em vez de retornar null.

**Correcoes:**

- **Migracao SQL:**
  - Criar trigger `on_auth_user_created` que chama `handle_new_user()` em `auth.users`
  - Adicionar politica RLS em `profiles`: SELECT para `authenticated` com condicao `true` (apenas campos publicos via query selectiva no codigo)
  - Habilitar realtime na tabela `orders`

- **Cart.tsx:** Remover taxa fixa, mostrar "Taxa calculada no checkout"
- **Checkout.tsx:** Buscar `delivery_fee` da loja via query a `stores` usando `currentStoreId`
- **CouponInput.tsx:** `.single()` → `.maybeSingle()`

---

### Parte 2: Funcionalidades para Influenciadores (do PDF)

O documento pede 3 funcionalidades no app:

#### 2A. Sistema de Codigos de Afiliado
- Ja existe a tabela `coupons` -- os codigos de influenciadores (ex: JOY10) funcionam como cupons normais
- Adicionar campo `influencer_id` (uuid, nullable) na tabela `coupons` para ligar cupons a influenciadores
- Rastrear pedidos feitos com cada codigo via `user_coupons`

#### 2B. Pagina "Favoritos do Influenciador"
- Criar tabela `influencer_picks` (influencer_id, product_id, store_id, featured_text)
- Nova seccao na Home ou no StoreDetail: "Escolhas de [Nome]" com foto e pratos recomendados
- Card visual com avatar do influenciador e lista de produtos

#### 2C. Dashboard do Influenciador
- Nova pagina `/influencer/dashboard`
- Mostra: total de pedidos com o codigo, comissao acumulada, grafico de uso ao longo do tempo
- Query: contar `user_coupons` ligados aos cupons do influenciador
- Adicionar role `influencer` ao enum `app_role` ou usar uma flag na tabela profiles

---

### Secao Tecnica

**Migracao SQL (Parte 1):**
```sql
-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Permitir leitura basica de perfis entre utilizadores autenticados
CREATE POLICY "Authenticated users can view basic profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Realtime para orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
```

**Migracao SQL (Parte 2):**
```sql
-- Campo influencer nos cupons
ALTER TABLE public.coupons ADD COLUMN influencer_id uuid REFERENCES public.profiles(id);

-- Tabela de picks do influenciador
CREATE TABLE public.influencer_picks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id),
  store_id uuid REFERENCES public.stores(id),
  featured_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.influencer_picks ENABLE ROW LEVEL SECURITY;
-- Politicas RLS apropriadas
```

**Ficheiros a criar/modificar:**
- `src/pages/Cart.tsx` -- remover taxa fixa
- `src/pages/Checkout.tsx` -- buscar delivery_fee da loja
- `src/components/checkout/CouponInput.tsx` -- `.maybeSingle()`
- `src/pages/influencer/InfluencerDashboard.tsx` -- novo
- `src/components/home/InfluencerPicks.tsx` -- novo widget na home
- `src/App.tsx` -- adicionar rota `/influencer/dashboard`

**Sequencia:**
1. Migracoes SQL (trigger + RLS + tabelas influencer)
2. Corrigir bugs (Cart, Checkout, CouponInput)
3. Criar dashboard do influenciador
4. Criar seccao "Escolhas do Influenciador" na Home

