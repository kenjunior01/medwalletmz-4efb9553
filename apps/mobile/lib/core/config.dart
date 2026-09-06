/// Configuração de ambiente via --dart-define.
///
/// Correr a app sempre com:
///   --dart-define=SUPABASE_URL=https://pfqruzusjjxyidhqkiob.supabase.co
///   --dart-define=SUPABASE_ANON_KEY=<anon key do projeto>
///
/// A anon key encontra-se no painel do Supabase:
///   Settings → API → Project API Keys → `anon` / `publishable`
///
/// Nota de segurança: a anon key é pública por desenho — a proteção real
/// é feita por RLS (Row Level Security) no backend, que já está ativa em
/// todas as tabelas usadas por esta app.
abstract final class AppConfig {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Número de destino dos pagamentos manuais M-Pesa (produção).
  static const String mpesaDestination = '+258840000000';

  /// País por omissão (F1 — Moçambique). F3 traz os 22 países.
  static const String defaultCountry = 'MZ';

  /// Chave Google Maps (SDK Android/iOS) — usada no seletor de
  /// localização do módulo "Ganhe". Sem chave, o ecrã oferece a
  /// introdução manual de coordenadas.
  static const mapsApiKey = String.fromEnvironment('MAPS_API_KEY');

  static bool get hasMapsKey => mapsApiKey.isNotEmpty;

  /// Push real (FCM) — OPT-IN via --dart-define=FCM_ENABLED=true.
  ///
  /// Quando activo, a app inicializa o Firebase (firebase_core), pede
  /// permissão de notificações, obtém o token FCM e grava-o na tabela
  /// `fcm_tokens` (migração aditiva 20260906000000) — a mesma tabela
  /// que o dispatch engine do backend já consulta. Mensagens recebidas
  /// com a app aberta aparecem como notificação local (canal `push`).
  ///
  /// Sem a flag, a app funciona igual: notificações in-app + lembretes
  /// locais, zero dependência do Firebase em runtime.
  static const fcmEnabledRaw = String.fromEnvironment('FCM_ENABLED');
  static bool get fcmEnabled => fcmEnabledRaw == 'true';

  /// Recompensa base por instituição aprovada (espelha
  /// place_proposal_settings / registration_defaults na BD). É sempre
  /// DINHEIRO REAL, creditado na carteira do contribuidor na moeda do
  /// país da instituição (MZN, BRL, EUR…). Não existem pontos/coins.
  static const double rewardPerProposal = 25;
  static const int maxPendingPerUser = 20;

  /// Versão apresentada no ecrã de perfil.
  static const String appVersion = '0.2.0';
}
