import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/widgets/confetti_overlay.dart';
import '../data/game_repository.dart';

/// F41 — SaúdeCraft: Mina da Saúde ⛏️ (paridade com a web).
///
/// Jogo de mineração estilo Minecraft:
/// • Toca nos blocos para minerar (cada golpe = 1 golpe de picareta);
/// • Blocos raros (💎 Cristal de Saúde, ✚ Bloco Cruz) dão mais gemas;
/// • Combos rápidos geram CRÍTICOS com tremor de ecrã;
/// • 400 golpes/dia — tecto validado NO SERVIDOR (RPC `submit_mine_session`);
/// • O cliente nunca envia quantias; funciona offline e sincroniza depois.
class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen>
    with TickerProviderStateMixin {
  // ── Definições de blocos (paridade com a web) ──
  static const int dailyLimit = GameRepository.dailyLimit;
  static const int syncEvery = 40;
  static const int gridSize = 24; // 6 × 4

  late final math.Random _rng = math.Random();
  late final GameRepository _repo = GameRepository(Supabase.instance.client);

  // Loot da sessão (gemas por tipo)
  final Map<_Kind, int> _loot = {};

  // Células do tabuleiro
  late List<_Cell> _cells;

  // Sessão
  int _hits = 0;
  int _pending = 0;
  bool _flushing = false;
  int _combo = 0;
  int _lastHitMs = 0;
  bool _syncing = false;
  bool _hideBroken = false;

  // Servidor
  String? _userId;
  int _usedToday = 0;
  bool _quotaReady = false;
  int? _serverCoins;
  int? _serverXp;
  int _level = 1;

  // Efeitos
  late final AnimationController _shake;
  Timer? _flushTimer;

  int get _remaining {
    if (_userId == null) return dailyLimit;
    return math.max(0, dailyLimit - _usedToday - _hits);
  }

  bool get _broken => _userId != null && _quotaReady && _remaining <= 0;

  @override
  void initState() {
    super.initState();
    _cells = List.generate(gridSize, (i) => _Cell.newCell(i, _rng));
    _userId = Supabase.instance.client.auth.currentUser?.id;
    _shake = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 340),
    );
    _loadQuota();
    _flushTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      _flush(silent: true);
    });
  }

  @override
  void dispose() {
    // Offline-safe: tenta sincronizar golpes pendentes mesmo ao sair.
    if (_pending > 0 && _userId != null) {
      final n = _pending;
      _pending = 0;
      unawaited(_repo.submitSession(n));
    }
    _flushTimer?.cancel();
    _shake.dispose();
    super.dispose();
  }

  Future<void> _loadQuota() async {
    if (_userId == null) return;
    final q = await _repo.fetchTodayQuota();
    if (!mounted) return;
    setState(() {
      _usedToday = q.blocks;
      if (q.coins > 0 && _serverCoins == null) _serverCoins = q.coins;
      _quotaReady = true;
    });
  }

  /// Sincroniza golpes pendentes — o servidor calcula moedas/XP.
  Future<void> _flush({bool silent = false}) async {
    if (_userId == null || _flushing || _pending <= 0) return;
    final n = _pending;
    _pending = 0;
    _flushing = true;
    if (mounted) setState(() => _syncing = true);
    try {
      final res = await _repo.submitSession(n);
      if (!mounted) return;
      if (res == null) {
        // Offline: re-enfileira para tentar de novo.
        _pending += n;
        if (!silent) {
          _snack('Sem ligação — progresso guardado e será sincronizado');
        }
      } else if (res.success) {
        if (res.coinsAwarded > 0) {
          _snack('+${res.coinsAwarded} Joy Coins sincronizados! 🪙');
        }
        setState(() {
          if (res.totalJoyCoins != null) _serverCoins = res.totalJoyCoins;
          if (res.totalXp != null) _serverXp = res.totalXp;
          if (res.blocksRemainingToday > 0) {
            _usedToday = math.max(
                0, dailyLimit - res.blocksRemainingToday - _hits);
          }
        });
        final lvl = res.level ?? 1;
        if (lvl > _level) {
          _level = lvl;
          _celebrateLevel(lvl);
        }
      }
    } finally {
      _flushing = false;
      if (mounted) setState(() => _syncing = false);
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(msg, style: const TextStyle(fontFamily: 'monospace')),
        duration: const Duration(milliseconds: 1800),
      ));
  }

  void _celebrateLevel(int lvl) {
    if (!mounted) return;
    showConfetti(context, message: 'NÍVEL $lvl! 🎉');
    showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Center(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.3, end: 1),
          duration: const Duration(milliseconds: 450),
          curve: Curves.elasticOut,
          builder: (context, scale, child) =>
              Transform.scale(scale: scale, child: child),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 40),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xF01A1410),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.amber, width: 3),
              boxShadow: const [
                BoxShadow(color: Colors.amber, blurRadius: 40),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🎉', style: TextStyle(fontSize: 56)),
                const SizedBox(height: 8),
                Text('NÍVEL $lvl!',
                    style: TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: Colors.amber[300],
                      shadows: const [
                        Shadow(blurRadius: 0, offset: Offset(2, 2)),
                      ],
                    )),
                const SizedBox(height: 8),
                const Text(
                  'Taxa de mineração aumentada —\nmais Joy Coins por golpe!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Golpe de picareta — chamado por cada bloco.
  _HitResult _hit(int idx) {
    final cell = _cells[idx];
    final def = cellDefs[cell.kind]!;
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    _combo = nowMs - _lastHitMs <= 1400 ? _combo + 1 : 1;
    _lastHitMs = nowMs;
    final crit = _combo >= 4 && _rng.nextInt(100) < 28;

    _hits += 1;
    _pending += 1;
    final hpLeft = cell.hpLeft - 1;
    var broke = false;
    var gain = 0;

    if (hpLeft <= 0) {
      broke = true;
      gain = def.gems * (crit ? 2 : 1);
      _loot[cell.kind] = (_loot[cell.kind] ?? 0) + gain;
      cell.hpLeft = 0;
      cell.uid = -1; // em explosão
      // Respawn com novo bloco aleatório.
      final respawnIdx = idx;
      final uid = gridSize + _rng.nextInt(1 << 30);
      Future.delayed(const Duration(milliseconds: 380), () {
        if (!mounted) return;
        setState(() {
          _cells[respawnIdx] = _Cell.newCell(uid, _rng);
        });
      });
    } else {
      cell.hpLeft = hpLeft;
    }
    setState(() {});

    if (_pending >= syncEvery) {
      unawaited(_flush());
    } else if (_userId != null && _remaining - 1 <= 0) {
      unawaited(_flush().then((_) {
        if (mounted) HapticFeedback.heavyImpact();
      }));
    }

    return _HitResult(crit: crit, broke: broke, gain: gain, rare: def.rare);
  }

  void _shakeBoard() {
    _shake.forward(from: 0);
  }

  /* ─────────────────────────────── Build ─────────────────────────────── */

  @override
  Widget build(BuildContext context) {
    final xpTotal = (_serverXp ?? 0) + _hits;
    final xpInLevel = xpTotal % 500;
    final durability =
        _userId != null ? _remaining / dailyLimit : 1.0;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: const Color(0xFF14100C),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF241B12), Color(0xFF14100C), Color(0xFF0E0A07)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              const SizedBox(height: 10),
              _buildBars(xpInLevel, durability),
              if (_userId == null) _buildGuestBanner(),
              const SizedBox(height: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: _buildBoard(dark),
                ),
              ),
              _buildHotbar(),
              const SizedBox(height: 8),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Blocos raros 💎✚ dão mais gemas • 400 golpes/dia • '
                  'Cada golpe vira Joy Coins no servidor • Funciona offline',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white38,
                    fontSize: 10.5,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
      child: Row(
        children: [
          _McButton(
            onTap: () {
              unawaited(_flush(silent: true));
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                context.go('/home');
              }
            },
            child: const Icon(Icons.arrow_back_rounded,
                color: Colors.white, size: 20),
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              '⛏️ SAÚDECRAFT',
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 19,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                color: Color(0xFF4CAF50),
                shadows: [Shadow(color: Colors.black, offset: Offset(2, 2))],
              ),
            ),
          ),
          _McButton(
            onTap: () {
              unawaited(_flush(silent: true));
              context.push('/rewards');
            },
            child: const Icon(Icons.emoji_events_rounded,
                color: Colors.amber, size: 20),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: _mcSlotDecoration(borderRadius: 10),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🪙', style: TextStyle(fontSize: 14)),
                const SizedBox(width: 4),
                Text(
                  _serverCoins != null ? '$_serverCoins' : '—',
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.w900,
                    color: Colors.amber,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBars(int xpInLevel, double durability) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: _mcSlotDecoration(borderRadius: 8),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('🏆', style: TextStyle(fontSize: 12)),
                    SizedBox(width: 4),
                    _McText('NÍVEL', color: Color(0xFF4CAF50), fontSize: 12),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              _McText('$_level', color: Colors.white, fontSize: 14, bold: true),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 18,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(decoration: _mcSlotDecoration(borderRadius: 6)),
                      FractionallySizedBox(
                        widthFactor: xpInLevel / 500,
                        child: Container(
                          margin: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(4),
                            gradient: const LinearGradient(
                              colors: [Color(0xFF66BB6A), Color(0xFF2E7D32)],
                            ),
                          ),
                        ),
                      ),
                      _McText('XP $xpInLevel/500',
                          color: Colors.white, fontSize: 10, bold: true),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (_userId != null) ...[
            const SizedBox(height: 6),
            Row(
              children: [
                const _McText('⛏️ PICO',
                    color: Color(0xFFFFB74D), fontSize: 11, bold: true),
                const SizedBox(width: 8),
                Expanded(
                  child: SizedBox(
                    height: 10,
                    child: Stack(
                      children: [
                        Container(decoration: _mcSlotDecoration(borderRadius: 5)),
                        FractionallySizedBox(
                          widthFactor: _quotaReady ? durability : 1,
                          child: Container(
                            margin: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(3),
                              gradient: LinearGradient(colors: [
                                durability > 0.4
                                    ? const Color(0xFFFFB74D)
                                    : const Color(0xFFE57373),
                                durability > 0.4
                                    ? const Color(0xFFE65100)
                                    : const Color(0xFFB71C1C),
                              ]),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _McText(
                  _quotaReady ? '$_remaining/$dailyLimit' : '…',
                  color: Colors.white60,
                  fontSize: 11,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGuestBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      child: SizedBox(
        width: double.infinity,
        child: _McButton(
          onTap: () => context.push('/login'),
          color: const Color(0x33FFC107),
          child: const Padding(
            padding: EdgeInsets.symmetric(vertical: 6),
            child: _McText(
              'Entra na conta para trocar gemas por Joy Coins reais!',
              color: Color(0xFFFFECB3),
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBoard(bool dark) {
    return AnimatedBuilder(
      animation: _shake,
      builder: (context, child) {
        final t = _shake.value;
        final dx = math.sin(t * math.pi * 3) * 5 * (1 - t);
        return Transform.translate(
          offset: Offset(dx, dx * 0.4),
          child: child,
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF3A2F23), width: 4),
          gradient: const RadialGradient(
            center: Alignment(0, -0.7),
            radius: 1.4,
            colors: [Color(0xFF2C2216), Color(0xFF1A1410)],
          ),
          boxShadow: const [
            BoxShadow(color: Colors.black54, blurRadius: 24),
          ],
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 6,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
                childAspectRatio: 1,
              ),
              itemCount: _cells.length,
              itemBuilder: (context, i) {
                final cell = _cells[i];
                return _BlockWidget(
                  idx: i,
                  cell: cell,
                  rng: _rng,
                  onTap: _hit,
                  onCrit: _shakeBoard,
                );
              },
            ),
            // Tochas animadas (pulso suave)
            const Positioned(
                left: 2, top: 4, child: _Torch(delay: Duration(milliseconds: 0))),
            const Positioned(
                right: 2,
                top: 40,
                child: _Torch(delay: Duration(milliseconds: 500))),
            if (_broken && !_hideBroken) _buildBrokenOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _buildBrokenOverlay() {
    return Positioned.fill(
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          color: const Color(0xE6450A0A),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('⛏️💥', style: TextStyle(fontSize: 44)),
            const SizedBox(height: 8),
            const _McText('SEU PICO QUEBROU!',
                color: Color(0xFFFF8A80), fontSize: 18, bold: true),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: Text(
                'Mineraste $_hits blocos nesta sessão.\n'
                'Volta amanhã com um pico novo!',
                textAlign: TextAlign.center,
                style: const TextStyle(
                    color: Colors.white70, fontSize: 12.5, height: 1.5),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _McButton(
                  color: const Color(0xFF2E7D32),
                  onTap: () => context.pushReplacement('/rewards'),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: _McText('Recompensas',
                        color: Colors.white, fontSize: 12, bold: true),
                  ),
                ),
                const SizedBox(width: 10),
                _McButton(
                  onTap: () => setState(() => _hideBroken = true),
                  color: Colors.white24,
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: _McText('Ficar na Mina',
                        color: Colors.white, fontSize: 12, bold: true),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHotbar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: Wrap(
        alignment: WrapAlignment.center,
        spacing: 6,
        runSpacing: 6,
        children: [
          for (final kind in cellDefs.keys)
            Container(
              width: 52,
              height: 52,
              decoration: _mcSlotDecoration(),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    kind == _Kind.cross ? '✚' : cellDefs[kind]!.emoji,
                    style: TextStyle(
                      fontSize: 16,
                      color: kind == _Kind.cross
                          ? const Color(0xFFE53935)
                          : null,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    '${_lootOf(kind)}',
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          Container(
            width: 62,
            height: 52,
            decoration: _mcSlotDecoration(),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const _McText('GOLPES',
                    color: Colors.white54, fontSize: 9),
                _McText('$_hits',
                    color: const Color(0xFF4CAF50), fontSize: 14, bold: true),
              ],
            ),
          ),
          Container(
            width: 62,
            height: 52,
            decoration: _mcSlotDecoration(),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const _McText('SINC', color: Colors.white54, fontSize: 9),
                _McText(
                  _syncing ? '…' : (_pending > 0 ? '$_pending⏳' : 'OK ☁'),
                  color: _syncing
                      ? const Color(0xFF90CAF9)
                      : _pending > 0
                          ? Colors.amber
                          : const Color(0xFF4CAF50),
                  fontSize: 12,
                  bold: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  int _lootOf(_Kind kind) => _loot[kind] ?? 0;
}

/* ═══════════════════════ Modelo de dados ═══════════════════════ */

enum _Kind { grass, stone, iron, gold, diamond, cross }

class _Def {
  const _Def({
    required this.name,
    required this.emoji,
    required this.hp,
    required this.gems,
    required this.weight,
    required this.colors,
    this.rare = false,
  });

  final String name;
  final String emoji;
  final int hp;
  final int gems;
  final int weight;
  final List<Color> colors;
  final bool rare;
}

const Map<_Kind, _Def> cellDefs = {
  _Kind.grass: _Def(
    name: 'Grama', emoji: '🟩', hp: 2, gems: 1, weight: 38,
    colors: [Color(0xFF57A639), Color(0xFF7A5230), Color(0xFF8BC34A)],
  ),
  _Kind.stone: _Def(
    name: 'Pedra', emoji: '🪨', hp: 3, gems: 2, weight: 30,
    colors: [Color(0xFF9A9A9A), Color(0xFF6D6D6D), Color(0xFFBDBDBD)],
  ),
  _Kind.iron: _Def(
    name: 'Ferro', emoji: '⚙️', hp: 4, gems: 3, weight: 15,
    colors: [Color(0xFFE3B79B), Color(0xFFC69276), Color(0xFFF0D0B8)],
  ),
  _Kind.gold: _Def(
    name: 'Ouro', emoji: '🟡', hp: 5, gems: 4, weight: 10,
    colors: [Color(0xFFF7D94C), Color(0xFFD9B02A), Color(0xFFFFF59D)],
  ),
  _Kind.diamond: _Def(
    name: 'Cristal de Saúde', emoji: '💎', hp: 6, gems: 7, weight: 5,
    colors: [Color(0xFF6FE8E0), Color(0xFF2FB8C9), Color(0xFFE0FFFF)],
    rare: true,
  ),
  _Kind.cross: _Def(
    name: 'Bloco Cruz', emoji: '✚', hp: 4, gems: 10, weight: 2,
    colors: [Color(0xFFFFFFFF), Color(0xFFE53935), Color(0xFFFFCDD2)],
    rare: true,
  ),
};

const int _totalWeight =
    38 + 30 + 15 + 10 + 5 + 2;

_Kind _pickKind(math.Random rng) {
  var roll = rng.nextDouble() * _totalWeight;
  for (final k in cellDefs.keys) {
    roll -= cellDefs[k]!.weight;
    if (roll <= 0) return k;
  }
  return _Kind.grass;
}

class _Cell {
  _Cell(this.uid, this.kind, this.hpLeft);

  factory _Cell.newCell(int uid, math.Random rng) {
    final kind = _pickKind(rng);
    return _Cell(uid, kind, cellDefs[kind]!.hp);
  }

  int uid; // -1 = em explosão
  _Kind kind;
  int hpLeft;
}

class _HitResult {
  const _HitResult({
    required this.crit,
    required this.broke,
    required this.gain,
    required this.rare,
  });

  final bool crit;
  final bool broke;
  final int gain;
  final bool rare;
}

/* ═══════════════════════ Bloco do jogo ═══════════════════════ */

class _BlockWidget extends StatefulWidget {
  const _BlockWidget({
    required this.idx,
    required this.cell,
    required this.rng,
    required this.onTap,
    required this.onCrit,
  });

  final int idx;
  final _Cell cell;
  final math.Random rng;
  final _HitResult Function(int idx) onTap;
  final VoidCallback onCrit;

  @override
  State<_BlockWidget> createState() => _BlockWidgetState();
}

class _BlockWidgetState extends State<_BlockWidget>
    with SingleTickerProviderStateMixin {
  final List<_Particle> _particles = [];
  final List<_Floater> _floaters = [];
  int _floaterId = 0;
  late final Ticker _ticker;

  @override
  void initState() {
    super.initState();
    _ticker = createTicker((_) {
      if (mounted && (_particles.isNotEmpty || _floaters.isNotEmpty)) {
        setState(() {});
      }
    })..start();
  }

  void _burst({required int count, required List<Color> colors, required bool big}) {
    final rng = widget.rng;
    for (var i = 0; i < count; i++) {
      final ang = rng.nextDouble() * 2 * math.pi;
      final dist = (big ? 46 : 26) + rng.nextDouble() * (big ? 42 : 22);
      _particles.add(_Particle(
        dx: math.cos(ang) * dist,
        dy: math.sin(ang) * dist - 12,
        size: 3 + rng.nextDouble() * 3,
        color: colors[rng.nextInt(colors.length)],
        born: DateTime.now().millisecondsSinceEpoch,
      ));
    }
  }

  void _float(String text, Color color, {double size = 13}) {
    _floaters.add(_Floater(
      id: _floaterId++,
      text: text,
      color: color,
      size: size,
      born: DateTime.now().millisecondsSinceEpoch,
    ));
    final id = _floaterId - 1;
    Future.delayed(const Duration(milliseconds: 950), () {
      if (mounted) setState(() => _floaters.removeWhere((f) => f.id == id));
    });
  }

  void _handleTap() {
    if (widget.cell.uid == -1) return;
    HapticFeedback.lightImpact();
    final def = cellDefs[widget.cell.kind]!;
    final res = widget.onTap(widget.idx);
    if (res.crit) {
      _float('CRÍTICO! x4+', const Color(0xFFFFF176), size: 14);
      _burst(count: 14, colors: def.colors, big: true);
      HapticFeedback.mediumImpact();
      widget.onCrit();
    } else {
      _burst(count: 7, colors: def.colors, big: false);
    }
    if (res.broke) {
      _float('+${res.gain} ${def.emoji}',
          def.rare ? const Color(0xFF80DEEA) : Colors.white, size: 15);
      _burst(count: def.rare ? 22 : 12, colors: def.colors, big: true);
      HapticFeedback.heavyImpact();
      if (res.rare) widget.onCrit();
    }
  }

  @override
  Widget build(BuildContext context) {
    final def = cellDefs[widget.cell.kind]!;
    final isBreaking = widget.cell.uid == -1;
    final crackStage = isBreaking
        ? 1
        : (((def.hp - widget.cell.hpLeft) / def.hp) * 4).round();
    final nowMs = DateTime.now().millisecondsSinceEpoch;
    _particles.removeWhere((p) => nowMs - p.born > 680);
    _floaters.removeWhere((f) => nowMs - f.born > 920);

    // Durante a explosão o bloco desaparece, mas os efeitos continuam.
    final effectChildren = <Widget>[
      // Partículas
      ..._particles.map((p) {
            final t = ((nowMs - p.born) / 680).clamp(0.0, 1.0);
            final x = p.dx * t;
            final y = p.dy * t + 90 * t * t;
            return Positioned(
              left: 18 + x,
              top: 18 + y,
              child: Opacity(
                opacity: (1 - t).clamp(0.0, 1.0),
                child: Container(
                  width: p.size,
                  height: p.size,
                  decoration: BoxDecoration(
                    color: p.color,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            );
      }),
      // Textos flutuantes
      ..._floaters.map((f) {
        final t = ((nowMs - f.born) / 920).clamp(0.0, 1.0);
        return Positioned(
          left: 0,
          right: 0,
          top: 10 - 46 * t,
          child: Opacity(
            opacity: (1 - t).clamp(0.0, 1.0),
            child: Text(
              f.text,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: f.size,
                fontWeight: FontWeight.w900,
                color: f.color,
                shadows: const [
                  Shadow(color: Colors.black, offset: Offset(1.5, 1.5)),
                ],
              ),
            ),
          ),
        );
      }),
    ];

    final blockChildren = <Widget>[
      // O bloco propriamente dito (some durante a explosão)
      AnimatedContainer(
        duration: const Duration(milliseconds: 60),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: _blockGradient(def),
          ),
          borderRadius: BorderRadius.circular(6),
          border: Border(
            top: BorderSide(color: Colors.white.withAlpha(80), width: 3),
            left: BorderSide(color: Colors.white.withAlpha(50), width: 3),
            right: BorderSide(color: Colors.black.withAlpha(120), width: 3),
            bottom: BorderSide(color: Colors.black.withAlpha(150), width: 3),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha(130),
              offset: const Offset(0, 4),
            ),
            if (def.rare)
              BoxShadow(
                color: Colors.amber.withAlpha(90),
                blurRadius: 10,
              ),
          ],
        ),
        child: Center(
          child: widget.cell.kind == _Kind.cross
              ? const Text('✚',
                  style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFE53935)))
              : Text(def.emoji, style: const TextStyle(fontSize: 22)),
        ),
      ),
      // Rachaduras
      if (crackStage > 0)
        Positioned.fill(
          child: IgnorePointer(
            child: CustomPaint(
              painter: _CrackPainter(
                  stage: crackStage, seed: widget.cell.uid),
            ),
          ),
        ),
      // Contador de hp
      if (widget.cell.hpLeft > 0 && widget.cell.hpLeft < def.hp)
        Positioned(
          top: -4,
          right: -4,
          child: Container(
            padding: const EdgeInsets.all(2),
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text('${widget.cell.hpLeft}',
                style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: Colors.white)),
          ),
        ),
    ];

    return GestureDetector(
      onTap: _handleTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          if (!isBreaking) ...blockChildren,
          // Partículas e textos vivem mesmo depois da explosão
          ...effectChildren,
        ],
      ),
    );
  }

  List<Color> _blockGradient(_Def def) {
    switch (widget.cell.kind) {
      case _Kind.grass:
        return const [Color(0xFF57A639), Color(0xFF4E8F33), Color(0xFF6B4A2B)];
      case _Kind.stone:
        return const [Color(0xFFA5A5A5), Color(0xFF8A8A8A), Color(0xFF6E6E6E)];
      case _Kind.iron:
        return const [Color(0xFFE3B79B), Color(0xFFD0A188), Color(0xFFB07E62)];
      case _Kind.gold:
        return const [Color(0xFFF7D94C), Color(0xFFE3BE33), Color(0xFFC79A1E)];
      case _Kind.diamond:
        return const [Color(0xFF6FE8E0), Color(0xFF4CCFD8), Color(0xFF2FA8BE)];
      case _Kind.cross:
        return const [Color(0xFFFFFFFF), Color(0xFFF2F4F7), Color(0xFFDDE1E6)];
    }
  }
}

class _Particle {
  _Particle({
    required this.dx,
    required this.dy,
    required this.size,
    required this.color,
    required this.born,
  });

  final double dx;
  final double dy;
  final double size;
  final Color color;
  final int born;
}

class _Floater {
  _Floater({
    required this.id,
    required this.text,
    required this.color,
    required this.size,
    required this.born,
  });

  final int id;
  final String text;
  final Color color;
  final double size;
  final int born;
}

class _CrackPainter extends CustomPainter {
  const _CrackPainter({required this.stage, required this.seed});

  final int stage;
  final int seed;

  @override
  void paint(Canvas canvas, Size size) {
    final rng = math.Random(seed * 31 + stage);
    final paint = Paint()
      ..color = Colors.black.withAlpha(150)
      ..strokeWidth = 1.6
      ..style = PaintingStyle.stroke;
    final center = Offset(size.width / 2, size.height / 2);
    final lines = 2 + stage * 2;
    for (var i = 0; i < lines; i++) {
      final ang = rng.nextDouble() * 2 * math.pi;
      var p = center +
          Offset(math.cos(ang), math.sin(ang)) * size.width * 0.12;
      final path = Path()..moveTo(p.dx, p.dy);
      for (var s = 0; s < 3; s++) {
        p = p +
            Offset(
              math.cos(ang + (rng.nextDouble() - 0.5)) * size.width * 0.2,
              math.sin(ang + (rng.nextDouble() - 0.5)) * size.height * 0.2,
            );
        path.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_CrackPainter old) =>
      old.stage != stage || old.seed != seed;
}

class _Torch extends StatefulWidget {
  const _Torch({required this.delay});

  final Duration delay;

  @override
  State<_Torch> createState() => _TorchState();
}

class _TorchState extends State<_Torch> with SingleTickerProviderStateMixin {
  late final AnimationController _c;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1300))
      ..repeat(reverse: true);
    Future.delayed(widget.delay, () {
      if (mounted) _c.forward(from: 0);
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, _) => Opacity(
        opacity: 0.72 + 0.28 * _c.value,
        child: const Text('🔥', style: TextStyle(fontSize: 16)),
      ),
    );
  }
}

/* ═══════════════════════ Widgets utilitários ═══════════════════════ */

class _McText extends StatelessWidget {
  const _McText(this.text,
      {required this.color, this.fontSize = 13, this.bold = false});

  final String text;
  final Color color;
  final double fontSize;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: 'monospace',
        fontSize: fontSize,
        color: color,
        fontWeight: bold ? FontWeight.w900 : FontWeight.w600,
        shadows: const [Shadow(color: Colors.black45, offset: Offset(1, 1))],
      ),
    );
  }
}

class _McButton extends StatelessWidget {
  const _McButton({
    required this.onTap,
    required this.child,
    this.color = const Color(0x22FFFFFF),
  });

  final VoidCallback onTap;
  final Widget child;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: child,
        ),
      ),
    );
  }
}

Decoration _mcSlotDecoration({double borderRadius = 10}) {
  return BoxDecoration(
    color: const Color(0xFF1D1D21),
    borderRadius: BorderRadius.circular(borderRadius),
    border: Border(
      top: BorderSide(color: Colors.grey.shade600, width: 2),
      left: BorderSide(color: Colors.grey.shade600, width: 2),
      right: BorderSide(color: Colors.black, width: 2),
      bottom: BorderSide(color: Colors.black, width: 2),
    ),
    boxShadow: const [
      BoxShadow(color: Colors.black45, offset: Offset(0, 3)),
    ],
  );
}


