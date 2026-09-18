# Sincronização App ↔ Web — MedWallet MZ

Como a app (APK) e a plataforma web partilham os MESMOS dados, em
tempo real, na mesma base Supabase (`pfqruzusjjxyidhqkiob`).

## Princípio

NÃO existe "sincronização" no sentido clássico (cópias que se
combinam). A app e a web **leem e escrevem nas mesmas tabelas da
mesma base**, com RLS a isolar cada utilizador. O que muda é o
transporte:

| Camada         | Web                                    | App (APK)                          |
|----------------|----------------------------------------|------------------------------------|
| API            | `supabase-js` (PostgREST)              | `supabase_flutter` (PostgREST)     |
| Tempo real     | canal `postgres_changes`               | `.stream(primaryKey:)` (Realtime)  |
| Offline        | service worker + caches locais         | `OfflineCache` (sqflite) + fila    |
| Push           | `web_push_subscriptions` (VAPID)       | FCM (`fcm_tokens`)                 |
| Autenticação   | sessão Supabase (cookie/localStorage)  | sessão Supabase (token persistido) |

Como ambos usam a MESMA anon key e o MESMO projecto, um INSERT feito
num lado dispara Realtime no outro — sem transformações nem réplica.

## Fluxos sincronizados (tabela a tabela)

### Favoritos — `favorites` (F30)
- A web põe o coração no `StoreDetail` (`useFavorites` → INSERT/DELETE
  em `favorites`); a app põe o coração no detalhe da farmácia
  (`favorites_repository.toggleStore`).
- A página Favoritos da web mostra a secção "Sincronizados com o app"
  (canal `favorites-sync-web`); o ecrã Favoritos da app ouve a tabela
  com `.stream()` — aparece nos dois lados em ~1 s.
- Modelos iguais: `user_id + store_id + product_id`, RLS
  "Users can manage own favorites".

### Encomendas de farmácia — `orders` + `order_items` (F30)
- O pedido nasce no fluxo da web (`/pharmacy` → checkout); a farmácia
  avança o estado no painel dela.
- Web subscreve o canal `orders-updates`; a app ouve as MESMAS linhas
  via `watchOrders()` / `watchOrder(id)` — o tracking na app avança
  sozinho (Pendente → Confirmado → A Preparar → Pronto → A Caminho →
  Entregue), com entregador de `driver_assignments` + `profiles`.
- Cache offline: `orders_all` no sqflite (histórico abre sem rede).

### Moradas — `addresses`
- CRUD na app (sheet do perfil) e página `/addresses` da web;
  `is_default` segue a mesma sequência nas duas (limpar os outros →
  marcar este). Usada pelo checkout de entregas nos dois lados.

### Medicação — `prescriptions`, `prescription_items`, `medication_logs`, `medication_reminders`
- Toma registada offline entra em fila local e faz replay silencioso
  (web e app); mapa de adesão e tendências idênticos nos dois lados.

### Restantes domínios
Consultas, chat, laboratórios, círculos, carteira, seguros, sangue,
solidariedade — todos já leem/escrevem as MESMAS tabelas
(laboratórios: `clinics`+`lab_exams`+`lab_exam_orders`; carteira via
RPC `wallet_debit` idempotente; etc.).

## Regras de ouro (para novas funcionalidades)

1. **Nunca duplicar tabela.** Se a web usa `X`, a app usa `X` — mesmo
   shape, mesmo RLS. Divergência de dados começa com uma "cópia local
   melhorada".
2. **Realtime nos dois lados.** Web: `postgres_changes` com filtro
   `user_id`. App: `.stream(primaryKey: ['id'])` do supabase_flutter.
3. **`.stream()` não faz joins** — resolver embeds em lote dentro do
   `asyncMap` (ver `_resolveEmbeds` em `orders_repository.dart`).
4. **Cache offline é espelho, não fonte.** Chave estável
   (`'orders_all'`), stale-while-revalidate 12 s, nunca escrever nela
   dados que a BD não confirmou (excepto a fila de tomas offline).
5. **RLS é a autorização.** A anon key é pública por desenho; cada
   tabela nova tem de ter policy `auth.uid() = user_id`.
