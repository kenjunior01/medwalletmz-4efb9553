import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_background.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/skeleton.dart';
import '../data/referrals_repository.dart';

/// Convida e Ganha — o teu código de convite, aplicação do código de
/// um amigo e histórico dos convites. Recompensa = DINHEIRO REAL na
/// carteira (creditado pelo backend quando o convite é verificado) —
/// sem pontos nem moedas virtuais.
class ReferralsScreen extends ConsumerStatefulWidget {
  const ReferralsScreen({super.key});

  @override
  ConsumerState<ReferralsScreen> createState() => _ReferralsScreenState();
}

class _ReferralsScreenState extends ConsumerState<ReferralsScreen> {
  String? _myCode;
  List<Referral> _invites = const [];
  bool _loading = true;
  bool _applying = false;
  final _codeCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final repo = ref.read(referralRepositoryProvider);
    final results = await Future.wait([
      repo.fetchMyCode(),
      repo.fetchMyInvites(),
    ]);
    if (!mounted) return;
    setState(() {
      _myCode = results[0] as String?;
      _invites = results[1] as List<Referral>;
      _loading = false;
    });
  }

  Future<void> _copyCode() async {
    if (_myCode == null) return;
    await Clipboard.setData(ClipboardData(text: _myCode!));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('Código $_myCode copiado!'),
      behavior: SnackBarBehavior.floating,
    ));
  }

  Future<void> _applyCode() async {
    if (_applying) return;
    setState(() => _applying = true);
    final err = await ref
        .read(referralRepositoryProvider)
        .applyFriendCode(_codeCtrl.text);
    if (!mounted) return;
    setState(() => _applying = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(err ?? 'Convite aplicado! Recompensa chega após verificação.'),
      backgroundColor: err == null ? AppColors.success : AppColors.danger,
      behavior: SnackBarBehavior.floating,
    ));
    if (err == null) _codeCtrl.clear();
  }

  @override
  void dispose() {
    _codeCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final completed = _invites.where((r) => r.isCompleted).length;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          bottom: false,
          child: _loading
              ? ListView(
                  padding: const EdgeInsets.all(20),
                  children: const [
                    AppSkeleton(width: double.infinity, height: 150, radius: 22),
                    SizedBox(height: 14),
                    AppSkeleton(width: double.infinity, height: 90, radius: 20),
                  ],
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 30),
                  children: [
                    // ── Cabeçalho ────────────────────────────────
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back_rounded,
                              color: AppColors.textPrimary),
                        ),
                        const Expanded(
                          child: Text(
                            'Convida e Ganha',
                            style: TextStyle(
                              color: AppColors.textPrimary,
                              fontSize: 19,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // ── Herói do convite ──────────────────────────
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(24),
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Color(0xFF2E86BF),
                            Color(0xFF1E6B9C),
                            Color(0xFF0C3555),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.4),
                            blurRadius: 26,
                            offset: const Offset(0, 12),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.card_giftcard_rounded,
                              color: Colors.white, size: 34),
                          const SizedBox(height: 8),
                          const Text(
                            'Convida amigos, ganham ambos',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Dinheiro real na carteira quando o convite é verificado — o teu amigo ainda recebe um bónus de boas-vindas.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 12,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 14),
                          // Código próprio.
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 11),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: Colors.white.withOpacity(0.25)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _myCode ?? 'A gerar…',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 2.2,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                InkWell(
                                  onTap: _copyCode,
                                  borderRadius: BorderRadius.circular(10),
                                  child: Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color:
                                          Colors.white.withOpacity(0.18),
                                      borderRadius:
                                          BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.copy_rounded,
                                        size: 16, color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _Stat(
                                value: '${_invites.length}',
                                label: 'Convites enviados',
                              ),
                              const SizedBox(width: 18),
                              _Stat(
                                value: '$completed',
                                label: 'Verificados',
                              ),
                            ],
                          ),
                        ],
                      ),
                    )
                        .animate()
                        .fadeIn()
                        .slideY(begin: 0.08, curve: Curves.easeOut),
                    const SizedBox(height: 14),

                    // ── Aplicar código de amigo ───────────────────
                    Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.055),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: Colors.white.withOpacity(0.10)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Foste convidado? Aplica o código do amigo',
                            style: TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w800,
                                fontSize: 13.5),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Só um código por conta. O bónus de boas-vindas cai na tua carteira após verificação.',
                            style: TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 11.5),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _codeCtrl,
                                  textCapitalization:
                                      TextCapitalization.characters,
                                  style: const TextStyle(
                                      color: AppColors.textPrimary,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.5),
                                  decoration: InputDecoration(
                                    hintText: 'EX: MWZAB123',
                                    hintStyle: const TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 12.5,
                                        letterSpacing: 1.5),
                                    filled: true,
                                    fillColor:
                                        Colors.white.withOpacity(0.05),
                                    contentPadding: const EdgeInsets
                                        .symmetric(
                                        horizontal: 12, vertical: 10),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius.circular(12),
                                      borderSide: BorderSide(
                                          color: Colors.white
                                              .withOpacity(0.1)),
                                    ),
                                    focusedBorder: OutlineInputBorder(
                                      borderRadius:
                                          BorderRadius.circular(12),
                                      borderSide: const BorderSide(
                                          color: AppColors.accent),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 9),
                              SizedBox(
                                height: 42,
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(
                                      borderRadius:
                                          BorderRadius.circular(12),
                                    ),
                                  ),
                                  onPressed:
                                      _applying ? null : _applyCode,
                                  child: _applying
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child:
                                              CircularProgressIndicator(
                                                  strokeWidth: 2,
                                                  color: Colors.white))
                                      : const Text('Aplicar',
                                          style: TextStyle(
                                              fontWeight:
                                                  FontWeight.w800,
                                              fontSize: 13)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ── Histórico ─────────────────────────────────
                    const Text(
                      'OS MEUS CONVITES',
                      style: TextStyle(
                        color: AppColors.accent,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (_invites.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.045),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.inbox_rounded,
                                size: 20, color: AppColors.textMuted),
                            SizedBox(width: 11),
                            Expanded(
                              child: Text(
                                'Ainda sem convites. Partilha o teu código e começa a ganhar!',
                                style: TextStyle(
                                    color: AppColors.textSecondary,
                                    fontSize: 12.5),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      ..._invites.asMap().entries.map(
                            (e) => _InviteRow(
                              invite: e.value,
                              index: e.key,
                            ),
                          ),
                  ],
                ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w800)),
        const SizedBox(height: 2),
        Text(label,
            style: const TextStyle(color: Colors.white70, fontSize: 10.5)),
      ],
    );
  }
}

class _InviteRow extends StatelessWidget {
  const _InviteRow({required this.invite, required this.index});

  final Referral invite;
  final int index;

  Color get _statusColor =>
      invite.isCompleted ? AppColors.success : AppColors.warning;

  IconData get _statusIcon => invite.isCompleted
      ? Icons.check_circle_rounded
      : Icons.hourglass_top_rounded;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.055),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.09)),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: _statusColor.withOpacity(0.14),
            ),
            child: Icon(_statusIcon, size: 19, color: _statusColor),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  invite.isCompleted
                      ? 'Convite verificado — bónus na carteira'
                      : 'Convite a aguardar verificação',
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5),
                ),
                Text(
                  '${formatDateShort(invite.createdAt)} · ${invite.isCompleted ? "recompensa creditada" : "a plataforma verifica e credita o dinheiro real"}',
                  style: const TextStyle(
                      color: AppColors.textSecondary, fontSize: 11),
                ),
              ],
            ),
          ),
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: _statusColor.withOpacity(0.13),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              invite.statusLabel,
              style: TextStyle(
                  color: _statusColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    )
        .animate(delay: (45 * index).ms)
        .fadeIn()
        .slideX(begin: 0.06, curve: Curves.easeOut);
  }
}
