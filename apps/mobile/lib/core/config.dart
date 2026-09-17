/// Configuração de ambiente via --dart-define-from-file=env.json.
///
/// A forma recomendada é o ficheiro `env.json` na raiz de apps/mobile
/// (ver env.example.json — a anon key NÃO vive no repositório):
///
///   flutter run  --dart-define-from-file=env.json
///   flutter build apk --dart-define-from-file=env.json
///
/// O script ./run.sh detecta o env.json automaticamente.
/// Sem env.json, a URL cai no default de produção (a mesma instância
/// Supabase da versão web, projeto pfqruzusjjxyidhqkiob) e só falta
/// passar a anon key.
///
/// Nota de segurança: a anon key é pública por desenho (shipa no bundle
/// de qualquer visitante da versão web) — a proteção real é feita por
/// RLS (Row Level Security) no backend, activa em todas as tabelas
/// usadas por esta app.
abstract final class AppConfig {
  /// Mesma base de dados da versão web — default de produção embutido;
  /// o env.json/dart-define só é preciso para override ou para a key.
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://pfqruzusjjxyidhqkiob.supabase.co',
  );
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
  static const String appVersion = '0.6.0';
}
