import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/widgets/confetti_overlay.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../wallet/presentation/wallet_controller.dart';
import '../data/voucher_repository.dart';

/// F42 — Vouchers de Saúde familiares (paridade com a web).
///
/// Envia cuidado à família por código: o emissor debita a carteira,
/// gera um código partilhável (WhatsApp) e o destinatário resgata.
class VouchersScreen extends ConsumerStatefulWidget {
  const VouchersScreen({super.key});

  @override
  ConsumerState<VouchersScreen> createState() => _VouchersScreenState();
}

class _VouchersScreenState extends ConsumerState<VouchersScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);
  final _redeemCtrl = TextEditingController();

  static const _amountChips = [100.0, 200.0, 500.0, 1000.0];

  static const _categories = <String, (String, String)>{
    'qualquer': ('🎁', 'Uso livre'),
    'farmacia': ('💊', 'Farmácia'),
    'consulta': ('🩺', 'Consulta'),
    'exames': ('🔬', 'Exames'),
  };

  String _fmt(double v) =>
      v.truncateToDouble() == v ? v.toStringAsFixed(0) : v.toStringAsFixed(2);

  @override
  void initState() {
    super.initState();
    _tabs.addListener(() {
      if (mounted) setState(() {});
    });
  }

  void _snack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor:
            error ? Theme.of(context).colorScheme.error : const Color(0xFF0F766E),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String? _serverError(Object e) {
    final msg = e.toString();
    if (msg.contains('INSUFFICIENT_BALANCE')) return 'Saldo insuficiente na carteira';
    if (msg.contains('INVALID_AMOUNT')) return 'Valor entre 10 e 50 000 MZN';
    if (msg.contains('VOUCHER_NOT_FOUND')) return 'Código não encontrado';
    if (msg.contains('SELF_REDEEM')) return 'Não podes resgatar o teu próprio voucher';
    if (msg.contains('VOUCHER_EXPIRED')) return 'Este voucher já expirou';
    if (msg.contains('VOUCHER_NOT_ACTIVE')) return 'Voucher já utilizado ou cancelado';
    if (msg.contains('VOUCHER_NOT_YOURS')) return 'Voucher não é teu';
    return 'Falha de rede — tenta novamente';
  }

  Future<void> _refresh() async {
    ref.invalidate(vouchersMineProvider);
    ref.invalidate(walletStreamProvider);
  }

  Future<void> _redeem() async {
    final code = _redeemCtrl.text.trim();
    if (code.length < 6) {
      _snack('Introduz o código do voucher', error: true);
      return;
    }
    try {
      final amount = await ref.read(voucherRepositoryProvider).redeem(code);
      _redeemCtrl.clear();
      await _refresh();
      if (!mounted) return;
      showConfetti(context, message: '+${_fmt(amount)} MZN na carteira! 🎉');
    } catch (e) {
      _snack(_serverError(e) ?? 'Falha ao resgatar', error: true);
    }
  }

  void _shareWhatsApp(String code, double amount) {
    final text = Uri.encodeComponent(
      '🎁 Recebi um Voucher de Saúde MedWallet de ${_fmt(amount)} MZN para ti!\n'
      'Código: $code\n'
      'Resgata na app MedWallet 💚',
    );
    launchUrl(
        Uri.parse('https://wa.me/?text=$text'),
        mode: LaunchMode.externalApplication);
  }

  Future<void> _openCreateSheet() async {
    double amount = 200;
    final customCtrl = TextEditingController();
    final msgCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String category = 'qualquer';
    bool sending = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) => StatefulBuilder(
        builder: (sheetCtx, setSheet) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(sheetCtx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Novo voucher de saúde',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('O valor sai da tua carteira e vira um código que a família resgata.',
                  style: TextStyle(
                      fontSize: 12.5, color: Theme.of(sheetCtx).hintColor)),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _amountChips.map((a) {
                  final sel = customCtrl.text.isEmpty && amount == a;
                  return ChoiceChip(
                    label: Text(_fmt(a)),
                    selected: sel,
                    selectedColor: const Color(0xFF0D9488),
                    labelStyle: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: sel ? Colors.white : null,
                    ),
                    onSelected: (_) => setSheet(() {
                      amount = a;
                      customCtrl.clear();
                    }),
                  );
                }).toList(),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: customCtrl,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Outro valor (10–50 000)',
                  prefixText: 'MZN ',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: category,
                decoration: const InputDecoration(
                  labelText: 'Para quê?',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
                items: _categories.entries
                    .map((e) => DropdownMenuItem(
                          value: e.key,
                          child: Text('${e.value.$1} ${e.value.$2}'),
                        ))
                    .toList(),
                onChanged: (v) => setSheet(() => category = v ?? 'qualquer'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: msgCtrl,
                maxLength: 160,
                decoration: const InputDecoration(
                  labelText: 'Mensagem (opcional)',
                  hintText: 'Ex.: Curate logo, mamã! 💚',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Telefone (opcional)',
                  hintText: '+258 84 000 0000',
                  border: OutlineInputBorder(),
                  isDense: true,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF0D9488),
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: sending
                    ? null
                    : () async {
                        final finalAmount =
                            double.tryParse(customCtrl.text.trim()) ?? amount;
                        if (finalAmount < 10 || finalAmount > 50000) {
                          _snack('Valor entre 10 e 50 000 MZN', error: true);
                          return;
                        }
                        setSheet(() => sending = true);
                        try {
                          final voucher = await ref
                              .read(voucherRepositoryProvider)
                              .create(
                                amount: finalAmount,
                                category: category,
                                message: msgCtrl.text.trim(),
                                recipientPhone: phoneCtrl.text.trim(),
                              );
                          if (sheetCtx.mounted) Navigator.of(sheetCtx).pop();
                          await _refresh();
                          if (!mounted) return;
                          showConfetti(context,
                              message:
                                  'Voucher de ${_fmt(voucher.amount)} MZN criado!');
                          _showCodeDialog(voucher);
                        } catch (e) {
                          setSheet(() => sending = false);
                          _snack(
                              _serverError(e) ?? 'Falha ao criar voucher',
                              error: true);
                        }
                      },
                icon: sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.favorite),
                label: Text(sending ? 'A criar…' : 'Emitir voucher'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCodeDialog(HealthVoucher v) {
    showDialog<void>(
      context: context,
      builder: (dlgCtx) => AlertDialog(
        title: const Text('✅ Voucher pronto!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Voucher de ${_fmt(v.amount)} MZN criado.',
                style: const TextStyle(fontSize: 13)),
            const SizedBox(height: 12),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF10B981), width: 1.6),
                color: const Color(0xFF10B981).withOpacity(0.08),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SelectableText(v.code,
                      style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          letterSpacing: 2,
                          fontSize: 16,
                          color: Color(0xFF059669))),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: v.code));
                      _snack('Código copiado');
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dlgCtx).pop(),
            child: const Text('Fechar'),
          ),
          FilledButton.icon(
            style:
                FilledButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
            onPressed: () {
              Navigator.of(dlgCtx).pop();
              _shareWhatsApp(v.code, v.amount);
            },
            icon: const Icon(Icons.chat, size: 18),
            label: const Text('Enviar WhatsApp'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tabs.dispose();
    _redeemCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final vouchersAsync = ref.watch(vouchersMineProvider);
    final walletAsync = ref.watch(walletStreamProvider);
    final uid = ref.watch(currentUserIdProvider);
    final balance = walletAsync.value?.balance ?? 0;

    final all = vouchersAsync.value ?? const <HealthVoucher>[];
    final sent = all.where((v) => v.senderId == uid).toList();
    final received = all.where((v) => v.senderId != uid).toList();
    final shown = _tabs.index == 0 ? sent : received;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 132,
            backgroundColor: const Color(0xFF0F766E),
            foregroundColor: Colors.white,
            title: const Text('Voucher de Saúde',
                style: TextStyle(fontWeight: FontWeight.w800)),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF059669),
                      Color(0xFF0D9488),
                      Color(0xFF0E7490)
                    ],
                  ),
                ),
                child: Align(
                  alignment: Alignment.bottomLeft,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Envia cuidado à tua família, mesmo à distância 💚',
                            style: TextStyle(
                                color: Colors.white.withOpacity(0.85),
                                fontSize: 12.5)),
                        const SizedBox(height: 4),
                        Text(
                            'Saldo: ${_fmt(balance)} MZN',
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 14)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _redeemCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        labelText: 'Resgatar voucher',
                        hintText: 'MW-XXXX-XXXX',
                        border: const OutlineInputBorder(),
                        isDense: true,
                        prefixIcon:
                            const Icon(Icons.confirmation_number, size: 20),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.paste, size: 18),
                          tooltip: 'Colar',
                          onPressed: () async {
                            final data = await Clipboard.getData('text/plain');
                            if (data?.text != null &&
                                data!.text!.trim().isNotEmpty) {
                              _redeemCtrl.text =
                                  data.text!.trim().toUpperCase();
                            }
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF0D9488),
                      minimumSize: const Size(0, 48),
                    ),
                    onPressed: _redeem,
                    child: const Text('Resgatar'),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  side: const BorderSide(color: Color(0xFF0D9488)),
                  foregroundColor: const Color(0xFF0D9488),
                ),
                onPressed: _openCreateSheet,
                icon: const Icon(Icons.favorite),
                label: const Text('Criar voucher para a família',
                    style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabs,
                labelColor: theme.colorScheme.primary,
                unselectedLabelColor: theme.hintColor,
                indicatorColor: theme.colorScheme.primary,
                tabs: [
                  Tab(text: 'Enviados (${sent.length})'),
                  Tab(text: 'Recebidos (${received.length})'),
                ],
              ),
            ),
          ),
          if (vouchersAsync.isLoading)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              ),
            )
          else
            SliverToBoxAdapter(
              child: _VoucherList(
                vouchers: shown,
                isSent: _tabs.index == 0,
                fmt: _fmt,
                onShare: _shareWhatsApp,
                onCancel: (v) async {
                  try {
                    await ref.read(voucherRepositoryProvider).cancel(v.id);
                    await _refresh();
                    _snack('Voucher cancelado — valor devolvido à carteira');
                  } catch (_) {
                    _snack('Não foi possível cancelar', error: true);
                  }
                },
              ),
            ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.verified_user, size: 14, color: theme.hintColor),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Vouchers protegidos por código único e validação no servidor. '
                      'Cancelamento devolve 100% do valor.',
                      style:
                          TextStyle(fontSize: 11, color: theme.hintColor),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VoucherList extends StatelessWidget {
  const _VoucherList({
    required this.vouchers,
    required this.isSent,
    required this.fmt,
    required this.onShare,
    required this.onCancel,
  });

  final List<HealthVoucher> vouchers;
  final bool isSent;
  final String Function(double) fmt;
  final void Function(String code, double amount) onShare;
  final void Function(HealthVoucher v)? onCancel;

  @override
  Widget build(BuildContext context) {
    if (vouchers.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 36),
        child: Column(
          children: [
            Icon(isSent ? Icons.send_outlined : Icons.card_giftcard,
                size: 40,
                color: Theme.of(context).hintColor.withOpacity(0.4)),
            const SizedBox(height: 8),
            Text(
              isSent
                  ? 'Ainda não enviaste vouchers.'
                  : 'Ainda não recebeste vouchers. Partilha o teu código!',
              style:
                  TextStyle(fontSize: 13, color: Theme.of(context).hintColor),
            ),
          ],
        ),
      );
    }
    return Column(
      children: vouchers.map((v) {
        final (emoji, label) = switch (v.category) {
          'farmacia' => ('💊', 'Farmácia'),
          'consulta' => ('🩺', 'Consulta'),
          'exames' => ('🔬', 'Exames'),
          _ => ('🎁', 'Uso livre'),
        };
        final (statusLabel, statusColor) = switch (v.status) {
          VoucherStatus.active => ('Ativo', const Color(0xFF10B981)),
          VoucherStatus.redeemed => ('Resgatado', const Color(0xFF3B82F6)),
          VoucherStatus.expired => ('Expirado', const Color(0xFFF59E0B)),
          VoucherStatus.cancelled => ('Cancelado', Colors.grey),
        };
        return Card(
          margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
                color:
                    Theme.of(context).dividerColor.withOpacity(0.5)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(emoji, style: const TextStyle(fontSize: 22)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${fmt(v.amount)} MZN',
                              style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15)),
                          Text(label,
                              style: TextStyle(
                                  fontSize: 11.5,
                                  color: Theme.of(context).hintColor)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        color: statusColor.withOpacity(0.12),
                      ),
                      child: Text(statusLabel,
                          style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: statusColor)),
                    ),
                  ],
                ),
                if (v.message != null && v.message!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('“${v.message}”',
                      style: TextStyle(
                          fontSize: 11.5,
                          fontStyle: FontStyle.italic,
                          color: Theme.of(context).hintColor)),
                ],
                const SizedBox(height: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(v.code,
                            style: const TextStyle(
                                fontFamily: 'monospace',
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.2)),
                      ),
                      InkWell(
                        onTap: () {
                          Clipboard.setData(ClipboardData(text: v.code));
                          ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                  content: Text('Código copiado')));
                        },
                        child: const Icon(Icons.copy, size: 17),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      v.expiresAt == null
                          ? ''
                          : 'Expira ${v.expiresAt!.day}/${v.expiresAt!.month}/${v.expiresAt!.year}',
                      style: TextStyle(
                          fontSize: 10.5,
                          color: Theme.of(context).hintColor),
                    ),
                    if (isSent && v.status == VoucherStatus.active) ...[
                      TextButton.icon(
                        onPressed: () => onShare(v.code, v.amount),
                        icon: const Icon(Icons.chat, size: 15),
                        label: const Text('WhatsApp',
                            style: TextStyle(fontSize: 12)),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF25D366),
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                      TextButton.icon(
                        onPressed: () => onCancel?.call(v),
                        icon: const Icon(Icons.close, size: 15),
                        label: const Text('Cancelar',
                            style: TextStyle(fontSize: 12)),
                        style: TextButton.styleFrom(
                          foregroundColor: Colors.redAccent,
                          visualDensity: VisualDensity.compact,
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  _TabBarDelegate(this.tabBar);

  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
          BuildContext context, double shrinkOffset, bool overlapsContent) =>
      Container(
          color: Theme.of(context).scaffoldBackgroundColor, child: tabBar);

  @override
  bool shouldRebuild(_TabBarDelegate oldDelegate) => false;
}

/// Lista de vouchers do utilizador (enviados + recebidos via RLS).
final vouchersMineProvider =
    FutureProvider.autoDispose<List<HealthVoucher>>((ref) async {
  return ref.watch(voucherRepositoryProvider).fetchMine();
});
