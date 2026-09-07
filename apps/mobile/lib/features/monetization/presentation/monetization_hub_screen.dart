import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/monetization_repository.dart';

/// Hub de Monetização (paridade com `pages/MonetizationHub.tsx`): estado
/// da subscrição, convite com estatísticas de bónus reais (MZN), últimos
/// movimentos da carteira e atalhos para os módulos de ganho.
class MonetizationHubScreen extends ConsumerStatefulWidget {
  const MonetizationHubScreen({super.key});

  @override
  ConsumerState<MonetizationHubScreen> createState() =>
      _MonetizationHubScreenState();
}

class _MonetizationHubScreenState extends ConsumerState<MonetizationHubScreen> {
  bool _loading = true;
  ReferralInfo? _referral;
  double _bonusMzn = 0;
  int _bonusCoins = 0;
  List<HubWalletTx> _txs = [];
  String? _subStatus;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(monetizationRepositoryProvider);
    try {
      final referral = await repo.fetchReferralInfo();
      final bonus = await repo.fetchReferralBonus();
      final txs = await repo.fetchRecentTransactions();
      final sub = await repo.fetchSubscriptionStatus();
      if (!mounted) return;
      setState(() {
        _referral = referral;
        _bonusMzn = bonus.$1;
        _bonusCoins = bonus.$2;
        _txs = txs;
        _subStatus = sub;
      });
    } catch (_) {
      // estado vazio
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _copyCode() {
    final code = _referral?.referralCode ?? '';
    if (code.isEmpty) return;
    Clipboard.setData(ClipboardData(text: code));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('Código $code copiado!'),
      backgroundColor: AppColors.success,
    ));
  }

  Future<void> _shareWhatsApp() async {
    final code = _referral?.referralCode ?? '';
    final text = 'Junta-te a mim na MedWallet MZ! Usa o meu convite '
        '$code e ganha bónus real na carteira. 💙🐻';
    final uri = Uri(
        scheme: 'https',
        host: 'wa.me',
        queryParameters: {'text': text});
    try {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      Clipboard.setData(ClipboardData(text: text));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Mensagem copiada — cola no WhatsApp'),
        backgroundColor: AppColors.info,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return AppBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Monetização 💰'),
          actions: [
            IconButton(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded),
              tooltip: 'Actualizar',
            ),
          ],
        ),
        body: _loading
            ? ListView(
                padding: const EdgeInsets.all(16),
                children: const [
                  AppSkeleton(height: 120),
                  SizedBox(height: 12),
                  AppSkeleton(height: 170),
                  SizedBox(height: 12),
                  AppSkeleton(height: 150),
                ],
              )
            : RefreshIndicator(
                onRefresh: _load,
                color: AppColors.accent,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    _SubscriptionCard(status: _subStatus),
                    const SizedBox(height: 14),
                    _ReferralCard(
                      referral: _referral,
                      bonusMzn: _bonusMzn,
                      bonusCoins: _bonusCoins,
                      onCopy: _copyCode,
                      onShare: _shareWhatsApp,
                    ),
                    const SizedBox(height: 14),
                    _QuickLinks(),
                    const SizedBox(height: 14),
                    _RecentTxs(txs: _txs),
                  ],
                ),
              ),
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  const _SubscriptionCard({required this.status});
  final String? status;

  @override
  Widget build(BuildContext context) {
    final active = status == 'active';
    final pending = status == 'pending';
    final color = active
        ? AppColors.success
        : (pending ? AppColors.warning : AppColors.textMuted);
    final label = status == null
        ? 'Sem subscrição'
        : MonetizationRepository.subscriptionLabel(status!);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [
          active ? const Color(0xFF065F46) : AppColors.bgHigh,
          active ? const Color(0xFF064E3B) : AppColors.card,
        ]),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: active
              ? AppColors.success.withOpacity(0.4)
              : AppColors.glassBorder,
        ),
      ),
      child: Row(
        children: [
          Icon(
            active
                ? Icons.verified_rounded
                : (pending ? Icons.hourglass_top_rounded : Icons.lock_clock_rounded),
            color: color,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Subscrição $label',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 14.5)),
                const SizedBox(height: 2),
                Text(
                  active
                      ? 'Benefícios Plus/Premium activos em toda a app.'
                      : 'Subscreve com M-Pesa para desbloquear benefícios.',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          if (!active)
            TextButton(
              onPressed: () => context.push('/plans'),
              child: const Text('Ver planos',
                  style: TextStyle(
                      color: AppColors.accent,
                      fontWeight: FontWeight.w800)),
            ),
        ],
      ),
    );
  }
}

class _ReferralCard extends StatelessWidget {
  const _ReferralCard({
    required this.referral,
    required this.bonusMzn,
    required this.bonusCoins,
    required this.onCopy,
    required this.onShare,
  });

  final ReferralInfo? referral;
  final double bonusMzn;
  final int bonusCoins;
  final VoidCallback onCopy;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final r = referral;
    final code = r?.referralCode ?? '—';
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1D4ED8), Color(0xFF172554)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Convida & Ganha dinheiro real',
              style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 15.5)),
          const SizedBox(height: 4),
          Text(
            'Cada amigo que entra e completa o registo rende-te '
            '${bonusMzn > 0 ? formatMZN(bonusMzn) : 'bónus em MZN'}'
            '${bonusCoins > 0 ? ' + $bonusCoins pontos' : ''}. '
            'Sem pontos fictícios — dinheiro na carteira.',
            style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 12,
                height: 1.45),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: onCopy,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                    color: Colors.white.withOpacity(0.25),
                    style: BorderStyle.solid),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.copy_rounded,
                      color: Colors.white, size: 16),
                  const SizedBox(width: 8),
                  Text(code,
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 17,
                          letterSpacing: 1.2)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _RefStat(
                  value: '${r?.referrals.length ?? 0}',
                  label: 'convites enviados'),
              _RefStat(
                  value: '${r?.completedCount ?? 0}',
                  label: 'registos completos'),
              _RefStat(
                  value: formatMZN(r?.totalBonusMzn ?? 0),
                  label: 'bónus ganho'),
            ],
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: onShare,
            icon: const Icon(Icons.share_rounded, size: 17),
            label: const Text('Partilhar no WhatsApp',
                style: TextStyle(fontWeight: FontWeight.w800)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: const Color(0xFF172554),
              minimumSize: const Size(double.infinity, 44),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}

class _RefStat extends StatelessWidget {
  const _RefStat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value,
              style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 16)),
          Text(label,
              style: TextStyle(
                  color: Colors.white.withOpacity(0.65), fontSize: 10)),
        ],
      ),
    );
  }
}

class _QuickLinks extends StatelessWidget {
  static const List<(IconData, String, String, Color, String)> _links = [
    (
      Icons.directions_bike_rounded,
      'Riders',
      'Entrega e ganha',
      Color(0xFF059669),
      '/riders',
    ),
    (
      Icons.storefront_rounded,
      'Classificados',
      'Compra e vende',
      Color(0xFF7C3AED),
      '/ads',
    ),
    (
      Icons.emoji_events_rounded,
      'Recompensas',
      'Níveis e conquistas',
      Color(0xFFF59E0B),
      '/rewards',
    ),
    (
      Icons.public_rounded,
      'Impacto',
      'Números da rede',
      Color(0xFF0EA5E9),
      '/impact',
    ),
    (
      Icons.card_giftcard_rounded,
      'Carteira',
      'Saldo e saques',
      Color(0xFF10B981),
      '/wallet',
    ),
    (
      Icons.workspace_premium_rounded,
      'Planos',
      'Plus & Premium',
      Color(0xFFD97706),
      '/plans',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Formas de ganhar',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.05,
          ),
          itemCount: _links.length,
          itemBuilder: (_, i) {
            final l = _links[i];
            return GestureDetector(
              onTap: () => context.push(l.$5),
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.glassFill,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.glassBorder),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: l.$4.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(l.$1, color: l.$4, size: 20),
                    ),
                    const SizedBox(height: 6),
                    Text(l.$2,
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w800,
                            fontSize: 12)),
                    Text(l.$3,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: AppColors.textMuted, fontSize: 9.5)),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }
}

class _RecentTxs extends StatelessWidget {
  const _RecentTxs({required this.txs});
  final List<HubWalletTx> txs;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text('Últimos movimentos da carteira',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w800)),
            const Spacer(),
            TextButton(
              onPressed: () => context.push('/wallet'),
              child: const Text('Ver tudo',
                  style: TextStyle(
                      color: AppColors.accent, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (txs.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.glassFill,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.glassBorder),
            ),
            child: const Text(
              'Sem movimentos ainda. Convites, entregas e sugestões de '
              'instituições aprovadas entram aqui como DINHEIRO REAL.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textMuted, fontSize: 12, height: 1.5),
            ),
          )
        else
          ...txs.map((t) {
            final label = _typeLabel(t.type);
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.glassFill,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.glassBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    t.isPositive
                        ? Icons.arrow_downward_rounded
                        : Icons.arrow_upward_rounded,
                    size: 16,
                    color: t.isPositive ? AppColors.success : AppColors.danger,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(label,
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w700,
                            fontSize: 12.5)),
                  ),
                  Text(
                    '${t.isPositive ? '+' : ''}${formatMZN(t.amount)}',
                    style: TextStyle(
                        color: t.isPositive ? AppColors.success : AppColors.danger,
                        fontWeight: FontWeight.w800,
                        fontSize: 13),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  String _typeLabel(String type) {
    switch (type) {
      case 'referral_bonus':
        return 'Bónus de convite';
      case 'suggestion_reward':
        return 'Recompensa por sugestão';
      case 'blood_donation':
        return 'Doação de sangue';
      case 'worker_booking':
        return 'Consulta com agente';
      case 'subscription':
        return 'Subscrição';
      case 'withdrawal':
        return 'Levantamento';
      case 'topup':
      case 'deposit':
        return 'Carregamento';
      default:
        return type.replaceAll('_', ' ');
    }
  }
}
