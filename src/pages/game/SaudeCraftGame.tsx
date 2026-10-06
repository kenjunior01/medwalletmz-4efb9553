/**
 * F41 — SaúdeCraft: Mina da Saúde 🛠️
 * Jogo de mineração estilo Minecraft — web (paridade com o APK).
 *
 * • Toca nos blocos para minerar (cada golpe = 1 bloco no servidor);
 * • Blocos raros (Cristal de Saúde, Bloco Cruz) dão mais gemas e espetáculo;
 * • Combos rápidos geram CRÍTICOS visuais com tremor de ecrã;
 * • 400 golpes/dia (tecto validado NO SERVIDOR via RPC submit_mine_session);
 * • O cliente nunca envia quantias — o servidor calcula moedas e XP;
 * • 100% offline-first: joga sem rede, sincroniza quando houver ligação.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import {
  ArrowLeft, Coins, LogIn, Sparkles, Trophy,
} from '@/components/icons/lucide-compat';

/* ─────────────────────────── Definições de blocos ─────────────────────── */

type BlockKind = 'grass' | 'stone' | 'iron' | 'gold' | 'diamond' | 'cross';

interface BlockDef {
  kind: BlockKind;
  name: string;
  emoji: string;
  hp: number;
  gems: number;
  weight: number;
  bg: string;
  rare?: boolean;
}

const BLOCKS: Record<BlockKind, BlockDef> = {
  grass: {
    kind: 'grass', name: 'Grama', emoji: '🟩', hp: 2, gems: 1, weight: 38,
    bg: 'linear-gradient(180deg,#57a639 0%,#4e8f33 30%,#6b4a2b 34%,#7a5230 100%)',
  },
  stone: {
    kind: 'stone', name: 'Pedra', emoji: '🪨', hp: 3, gems: 2, weight: 30,
    bg: 'linear-gradient(180deg,#9a9a9a,#7d7d7d)',
  },
  iron: {
    kind: 'iron', name: 'Ferro', emoji: '⚙️', hp: 4, gems: 3, weight: 15,
    bg: 'linear-gradient(180deg,#e3b79b,#c69276)',
  },
  gold: {
    kind: 'gold', name: 'Ouro', emoji: '🟡', hp: 5, gems: 4, weight: 10,
    bg: 'linear-gradient(180deg,#f7d94c,#d9b02a)',
  },
  diamond: {
    kind: 'diamond', name: 'Cristal de Saúde', emoji: '💎', hp: 6, gems: 7, weight: 5,
    bg: 'linear-gradient(180deg,#6fe8e0,#2fb8c9)', rare: true,
  },
  cross: {
    kind: 'cross', name: 'Bloco Cruz', emoji: '✚', hp: 4, gems: 10, weight: 2,
    bg: 'linear-gradient(180deg,#ffffff,#e8eaed)', rare: true,
  },
};

const KINDS = Object.values(BLOCKS);
const TOTAL_WEIGHT = KINDS.reduce((s, b) => s + b.weight, 0);
const DAILY_LIMIT = 400;   // tecto duro no servidor
const SYNC_EVERY = 40;     // sincroniza a cada N golpes
const GRID = 24;           // 6 × 4

function pickKind(): BlockKind {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const b of KINDS) {
    roll -= b.weight;
    if (roll <= 0) return b.kind;
  }
  return 'grass';
}

function freshCell(uid: number) {
  const kind = pickKind();
  return { uid, kind, hpLeft: BLOCKS[kind].hp };
}

interface Particle { id: number; left: number; top: number; dx: string; dy: string; color: string; }
interface Floater { id: number; left: number; top: number; text: string; cls: string; }

interface SyncResult {
  success?: boolean;
  error?: string;
  blocks_credited?: number;
  coins_awarded?: number;
  xp_awarded?: number;
  blocks_remaining_today?: number;
  total_joy_coins?: number;
  total_xp?: number;
  level?: number;
  reason?: string;
}

/* ───────────────────────────────── Página ─────────────────────────────── */

export default function SaudeCraftGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [cells, setCells] = useState(() =>
    Array.from({ length: GRID }, (_, i) => freshCell(i)));
  const [hits, setHits] = useState(0);
  const [loot, setLoot] = useState<Record<BlockKind, number>>({
    grass: 0, stone: 0, iron: 0, gold: 0, diamond: 0, cross: 0,
  });
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [shake, setShake] = useState(false);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('saudecraft_muted') === '1'; } catch { return false; }
  });
  const [usedToday, setUsedToday] = useState(0);
  const [quotaReady, setQuotaReady] = useState(!user);
  const [syncing, setSyncing] = useState(false);
  const [serverCoins, setServerCoins] = useState<number | null>(null);
  const [serverXp, setServerXp] = useState<number | null>(null);
  const [levelNow, setLevelNow] = useState(1);
  const [levelUpTo, setLevelUpTo] = useState<number | null>(null);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const pendingRef = useRef(0);
  const flushingRef = useRef(false);
  const lastHitRef = useRef(0);
  const comboRef = useRef(0);
  const uidRef = useRef(GRID);
  const idRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const levelRef = useRef(1);
  const brokenRef = useRef(false);
  const hitsRef = useRef(0);
  hitsRef.current = hits;
  const usedRef = useRef(0);
  usedRef.current = usedToday;

  const remaining = user ? Math.max(0, DAILY_LIMIT - usedToday - hits) : Infinity;
  const broken = user && quotaReady && remaining <= 0;
  brokenRef.current = !!broken;

  /* ── Som 8-bit (WebAudio, gerado — zero assets) ── */
  const beep = useCallback((freq: number, dur = 0.08, slideTo?: number, vol = 0.07) => {
    if (muted) return;
    try {
      if (!audioRef.current) {
        const Ctx = window.AudioContext
          || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioRef.current = new Ctx();
      }
      const ctx = audioRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch { /* áudio é opcional */ }
  }, [muted]);

  const arpeggio = useCallback((freqs: number[], step = 0.09) => {
    freqs.forEach((f, i) => setTimeout(() => beep(f, 0.12, undefined, 0.09), i * step * 1000));
  }, [beep]);

  /* ── Efeitos visuais ── */
  const spawnBurst = useCallback((el: HTMLElement, n: number, colors: string[], big = false) => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cx = r.left - b.left + r.width / 2;
    const cy = r.top - b.top + r.height / 2;
    const items: Particle[] = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = (big ? 70 : 40) + Math.random() * (big ? 60 : 34);
      items.push({
        id: idRef.current++,
        left: cx + (Math.random() - 0.5) * r.width * 0.6,
        top: cy + (Math.random() - 0.5) * r.height * 0.6,
        dx: `${Math.cos(ang) * dist}px`,
        dy: `${Math.sin(ang) * dist - 18}px`,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    setParticles((p) => [...p, ...items]);
    const ids = new Set(items.map((i) => i.id));
    setTimeout(() => setParticles((p) => p.filter((x) => !ids.has(x.id))), 750);
  }, []);

  const spawnFloater = useCallback((el: HTMLElement, text: string, cls: string) => {
    const board = boardRef.current;
    if (!board) return;
    const b = board.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const id = idRef.current++;
    setFloaters((f) => [...f, {
      id, left: r.left - b.left + r.width / 2, top: r.top - b.top, text, cls,
    }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 950);
  }, []);

  const flashShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 320);
  }, []);

  /* ── Sincronização com o servidor (anti-abuso no lado do servidor) ── */
  const flush = useCallback(async (silent = false) => {
    if (!user || flushingRef.current) return;
    const n = pendingRef.current;
    if (n <= 0) return;
    flushingRef.current = true;
    pendingRef.current = 0;
    setSyncing(true);
    try {
      const { data, error } = await (supabase as any).rpc('submit_mine_session', {
        p_blocks_mined: n,
      });
      if (error) throw error;
      const r = (data ?? {}) as SyncResult;
      if (r.success) {
        if ((r.coins_awarded ?? 0) > 0) {
          toast.success(`+${r.coins_awarded} Joy Coins sincronizados! 🪙`);
          arpeggio([659, 784, 988]);
        }
        if (typeof r.total_joy_coins === 'number') setServerCoins(r.total_joy_coins);
        if (typeof r.total_xp === 'number') setServerXp(r.total_xp);
        if (typeof r.blocks_remaining_today === 'number') {
          setUsedToday(Math.max(0, DAILY_LIMIT - r.blocks_remaining_today - hitsRef.current));
        }
        if (typeof r.level === 'number' && r.level > levelRef.current) {
          levelRef.current = r.level;
          setLevelNow(r.level);
          setLevelUpTo(r.level);
          arpeggio([392, 523, 659, 784, 1047]);
        }
        queryClient.invalidateQueries({ queryKey: ['user-gamification'] });
        queryClient.invalidateQueries({ queryKey: ['gamification-leaderboard'] });
      }
    } catch (err) {
      // Offline-first: devolve os golpes à fila para tentar de novo
      pendingRef.current += n;
      logger.error('SaúdeCraft sync falhou:', err);
      if (!silent) toast.info('Sem ligação — progresso guardado e será sincronizado');
    } finally {
      flushingRef.current = false;
      setSyncing(false);
    }
  }, [user, queryClient, arpeggio]);

  /* Quota do dia (golpes já usados noutras sessões/dispositivos) */
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await (supabase as any)
          .from('game_mine_daily')
          .select('blocks, coins')
          .eq('user_id', user.id)
          .eq('day', today)
          .maybeSingle();
        if (!alive) return;
        if (data) {
          setUsedToday((data as { blocks?: number }).blocks ?? 0);
          if (typeof (data as { coins?: number }).coins === 'number') {
            setServerCoins((data as { coins?: number }).coins ?? 0);
          }
        }
      } catch (err) {
        logger.error('SaúdeCraft quota:', err);
      } finally {
        if (alive) setQuotaReady(true);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  /* Flush periódico + ao esconder a aba */
  useEffect(() => {
    const iv = setInterval(() => { void flush(true); }, 60_000);
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(true); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  /* ── Golpe da picareta ── */
  const onHit = useCallback((idx: number, ev: React.MouseEvent<HTMLDivElement>) => {
    if (brokenRef.current) return;
    const el = ev.currentTarget;
    const cell = cells[idx];
    const def = BLOCKS[cell.kind];
    const now = Date.now();

    // Combo e crítico (apenas espetáculo — o servidor calcula as moedas)
    comboRef.current = now - lastHitRef.current <= 1400 ? comboRef.current + 1 : 1;
    lastHitRef.current = now;
    const c = comboRef.current;
    setCombo(c);
    const crit = c >= 4 && Math.random() < 0.28;

    const colors: Record<BlockKind, string[]> = {
      grass: ['#57a639', '#7a5230', '#8bc34a'],
      stone: ['#9a9a9a', '#6d6d6d', '#bdbdbd'],
      iron: ['#e3b79b', '#c69276', '#f0d0b8'],
      gold: ['#f7d94c', '#d9b02a', '#fff59d'],
      diamond: ['#6fe8e0', '#2fb8c9', '#e0ffff'],
      cross: ['#ffffff', '#e53935', '#ffcdd2'],
    };

    spawnBurst(el, crit ? 14 : 7, colors[cell.kind], crit || def.rare);
    if (crit) {
      spawnFloater(el, `CRÍTICO! x${Math.min(c, 10)}`, 'text-yellow-300 text-lg');
      flashShake();
      beep(880, 0.1, 1245);
    } else {
      beep(160 + def.hp * 22 + c * 6, 0.05);
    }

    const hpLeft = cell.hpLeft - 1;
    setHits((h) => h + 1);
    pendingRef.current += 1;

    if (hpLeft <= 0) {
      // Bloco quebrou! Loot + explosão + respawn
      const gain = def.gems * (crit ? 2 : 1);
      setLoot((l) => ({ ...l, [cell.kind]: l[cell.kind] + gain }));
      spawnFloater(el, `+${gain} ${def.emoji}`, def.rare ? 'text-cyan-300 text-xl' : 'text-white');
      spawnBurst(el, def.rare ? 22 : 12, colors[cell.kind], true);
      beep(420, 0.22, 70);
      if (def.rare) { arpeggio([523, 659, 784, 1047]); flashShake(); }
      setCells((cs) => cs.map((x, i) => (i === idx
        ? { ...x, uid: -1, hpLeft: 0 } // em explosão
        : x)));
      setTimeout(() => {
        setCells((cs) => cs.map((x, i) => (i === idx ? freshCell(uidRef.current++) : x)));
      }, 380);
    } else {
      setCells((cs) => cs.map((x, i) => (i === idx ? { ...x, hpLeft } : x)));
    }

    // Auto-sync a cada SYNC_EVERY golpes
    if (pendingRef.current >= SYNC_EVERY) void flush();
    // Pico quebrou?
    if (user && remaining - 1 <= 0) {
      void flush().then(() => beep(300, 0.5, 55, 0.12));
    }
  }, [cells, spawnBurst, spawnFloater, flashShake, beep, arpeggio, flush, user, remaining]);

  const toggleMute = () => {
    setMuted((m) => {
      try { localStorage.setItem('saudecraft_muted', m ? '0' : '1'); } catch { /* ok */ }
      return !m;
    });
  };

  const xpTotal = (serverXp ?? 0) + hits;
  const xpInLevel = xpTotal % 500;
  const durability = user ? (remaining / DAILY_LIMIT) * 100 : 100;
  const comboLabel = combo >= 2 ? `COMBO x${Math.min(combo, 10)}` : '';

  /* ─────────────────────────────── Render ─────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#14100c] text-white relative overflow-hidden">
      <style>{`
        @keyframes mc-particle { to { transform: translate(var(--dx), var(--dy)) scale(.15); opacity: 0; } }
        @keyframes mc-float { 0% { transform: translate(-50%, 0); opacity: 1; } 100% { transform: translate(-50%, -54px); opacity: 0; } }
        @keyframes mc-shake { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-5px,3px); } 50% { transform: translate(4px,-3px); } 75% { transform: translate(-2px,-2px); } }
        @keyframes mc-pop { 0% { transform: scale(.25); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes mc-flicker { 0%,100% { opacity: .8; filter: brightness(1); } 45% { opacity: 1; filter: brightness(1.3); } 60% { opacity: .75; } }
        @keyframes mc-dust { from { transform: translateY(0); opacity: .35; } to { transform: translateY(-140px); opacity: 0; } }
        @keyframes mc-levelpop { 0% { transform: scale(.3) rotate(-6deg); opacity: 0; } 60% { transform: scale(1.12) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(0); opacity: 1; } }
        @keyframes mc-vignette { 0%,100% { opacity: .55; } 50% { opacity: .8; } }
        @keyframes mc-hintpulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
        .mc-block { border-style: solid; border-width: 3px; border-color: rgba(255,255,255,.28) rgba(0,0,0,.45) rgba(0,0,0,.55) rgba(255,255,255,.16); box-shadow: inset -4px -4px 0 rgba(0,0,0,.32), inset 4px 4px 0 rgba(255,255,255,.2), 0 4px 0 rgba(0,0,0,.5); }
        .mc-slot { border: 3px solid; border-color: #5a5a5a #2c2c2c #1f1f1f #565656; background: #1d1d21; box-shadow: inset 0 0 0 2px rgba(255,255,255,.06); }
        .mc-font { font-family: ui-monospace, SFMono-Regular, Menlo, 'Courier New', monospace; letter-spacing: .04em; text-shadow: 2px 2px 0 rgba(0,0,0,.85); }
      `}</style>

      {/* Poeira da caverna */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="absolute rounded-full bg-white/20"
            style={{
              left: `${(i * 37 + 8) % 96}%`, top: `${25 + (i * 53) % 70}%`,
              width: 3, height: 3,
              animation: `mc-dust ${5 + (i % 4)}s linear ${i * 0.7}s infinite`,
            }} />
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="relative z-10 px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => { void flush(true); navigate(-1); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="mc-font text-xl sm:text-2xl font-black tracking-widest text-green-400">
            ⛏️ SAÚDECRAFT
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={muted ? 'Ligar som' : 'Desligar som'}>
              <span className="text-lg leading-none">{muted ? '🔇' : '🔊'}</span>
            </button>
            <div className="mc-slot rounded-lg px-3 py-1.5 flex items-center gap-1.5">
              <Coins className="h-5 w-5 text-yellow-300" />
              <span className="mc-font font-bold text-yellow-300">
                {serverCoins !== null ? serverCoins : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Nível + XP + durabilidade */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="mc-slot rounded-md px-2 py-1 mc-font text-sm font-bold text-green-400 flex items-center gap-1">
              <Trophy className="h-4 w-4" /> NÍVEL {levelNow}
            </div>
            <div className="flex-1 h-5 mc-slot rounded-md overflow-hidden relative">
              <div className="h-full bg-gradient-to-b from-green-400 to-green-600 transition-all duration-300"
                style={{ width: `${(xpInLevel / 500) * 100}%` }} />
              <span className="absolute inset-0 flex items-center justify-center mc-font text-[11px] font-bold">
                XP {xpInLevel}/500
              </span>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <div className="w-24 mc-font text-[11px] text-orange-300 font-bold">⛏️ PICO</div>
              <div className="flex-1 h-3 mc-slot rounded-md overflow-hidden">
                <div className={`h-full transition-all duration-300 ${durability > 40 ? 'bg-gradient-to-b from-orange-400 to-orange-600' : 'bg-gradient-to-b from-red-500 to-red-700'}`}
                  style={{ width: `${quotaReady ? durability : 100}%` }} />
              </div>
              <div className="w-16 text-right mc-font text-[11px] text-white/70">
                {quotaReady ? `${remaining}/${DAILY_LIMIT}` : '…'}
              </div>
            </div>
          )}
        </div>

        {/* Aviso para convidados */}
        {!user && (
          <button
            onClick={() => navigate('/auth')}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2.5 text-sm text-yellow-200 hover:bg-yellow-400/20 transition-colors">
            <LogIn className="h-4 w-4" />
            Entra na tua conta para trocar gemas por Joy Coins reais!
          </button>
        )}
      </div>

      {/* Caverna / tabuleiro */}
      <div className="relative z-10 px-3 mt-4">
        <div
          ref={boardRef}
          className={`relative rounded-2xl border-4 border-[#3a2f23] p-3 overflow-hidden ${shake ? '[animation:mc-shake_.32s_ease-in-out]' : ''}`}
          style={{
            background:
              'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(255,190,110,.10), transparent 60%),' +
              'radial-gradient(ellipse at 20% 80%, rgba(0,0,0,.55), transparent 55%),' +
              'linear-gradient(180deg,#241b12 0%,#1a1410 55%,#120d09 100%)',
          }}>
          {/* Tochas */}
          <span className="absolute left-1 top-6 text-xl [animation:mc-flicker_1.6s_ease-in-out_infinite] select-none" aria-hidden>🔥</span>
          <span className="absolute right-1 top-10 text-xl [animation:mc-flicker_2.1s_ease-in-out_infinite] select-none" aria-hidden>🔥</span>
          <span className="absolute left-2 bottom-8 text-xl [animation:mc-flicker_1.9s_ease-in-out_infinite] select-none" aria-hidden>🔥</span>

          <div className="grid grid-cols-6 gap-2">
            {cells.map((cell, idx) => {
              const def = BLOCKS[cell.kind];
              const isBreaking = cell.uid === -1;
              const crackStage = isBreaking ? 1 : Math.round(((def.hp - cell.hpLeft) / def.hp) * 4);
              return (
                <div
                  key={`${idx}-${cell.uid}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Minerar ${def.name}`}
                  onClick={(e) => { if (!isBreaking) onHit(idx, e); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                  className={`mc-block relative aspect-square rounded-md select-none touch-manipulation
                    ${isBreaking ? 'opacity-0 pointer-events-none' : 'cursor-pointer active:scale-95 transition-transform'}
                    ${def.rare ? 'ring-2 ring-yellow-300/70 [animation:mc-flicker_2.4s_ease-in-out_infinite]' : ''}`}
                  style={{ background: def.bg }}>
                  {/* textura de píxeis */}
                  <span className="absolute inset-0 rounded-md opacity-40 pointer-events-none"
                    style={{ background: 'repeating-linear-gradient(90deg, rgba(0,0,0,.09) 0 5px, transparent 5px 10px)' }} />
                  {/* emoji central */}
                  <span className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl drop-shadow-lg pointer-events-none">
                    {def.kind === 'cross' ? <span className="text-red-600 font-black text-3xl">✚</span> : def.emoji}
                  </span>
                  {/* rachaduras */}
                  {crackStage > 0 && !isBreaking && (
                    <span className="absolute inset-0 rounded-md pointer-events-none mix-blend-multiply"
                      style={{
                        opacity: 0.25 + crackStage * 0.18,
                        background:
                          'repeating-linear-gradient(60deg, transparent 0 6px, rgba(20,10,0,.7) 6px 7px),' +
                          'repeating-linear-gradient(-55deg, transparent 0 9px, rgba(20,10,0,.55) 9px 10px)',
                        backgroundSize: `${100 - crackStage * 18}% ${100 - crackStage * 14}%, ${90 + crackStage * 8}% ${100}%`,
                      }} />
                  )}
                  {/* hp pingável */}
                  {cell.hpLeft > 0 && cell.hpLeft < def.hp && (
                    <span className="absolute -top-1.5 -right-1.5 bg-black/80 rounded-full px-1.5 text-[10px] mc-font text-white pointer-events-none">
                      {cell.hpLeft}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Partículas e textos flutuantes */}
          {particles.map((p) => (
            <span key={p.id} className="absolute w-2 h-2 rounded-sm pointer-events-none z-20"
              style={{
                left: p.left, top: p.top, background: p.color,
                ['--dx' as string]: p.dx, ['--dy' as string]: p.dy,
                animation: 'mc-particle .7s ease-out forwards',
              }} />
          ))}
          {floaters.map((f) => (
            <span key={f.id}
              className={`absolute z-20 mc-font font-black pointer-events-none whitespace-nowrap ${f.cls}`}
              style={{ left: f.left, top: f.top, animation: 'mc-float .9s ease-out forwards' }}>
              {f.text}
            </span>
          ))}

          {/* Combo meter */}
          {combo >= 2 && !broken && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 mc-font text-sm font-black text-yellow-300 [animation:mc-hintpulse_1s_ease-in-out_infinite]">
              {comboLabel}
            </div>
          )}

          {/* Dica inicial */}
          {hits === 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 mc-font text-[11px] text-white/70 [animation:mc-hintpulse_1.4s_ease-in-out_infinite] whitespace-nowrap">
              👆 Toca nos blocos para minerar!
            </div>
          )}

          {/* Pico quebrou — overlay */}
          {broken && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-red-950/85 backdrop-blur-[2px] px-6 text-center">
              <span className="text-6xl">⛏️💥</span>
              <h2 className="mc-font text-2xl font-black text-red-300 [animation:mc-levelpop_.5s_ease-out]">
                SEU PICO QUEBROU!
              </h2>
              <p className="text-sm text-red-100/90 max-w-xs">
                Mineraste {hits} blocos nesta sessão. Volta amanhã com um pico novo
                para continuares a cavar a Mina da Saúde!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/rewards')}
                  className="mc-font rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-sm font-bold transition-colors">
                  Ver Recompensas
                </button>
                <button
                  onClick={() => navigate('/game')}
                  className="mc-font rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-bold transition-colors">
                  Ficar na Mina
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hotbar (inventário da sessão) */}
      <div className="relative z-10 px-3 mt-4 pb-6">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {KINDS.map((b) => (
            <div key={b.kind} className="mc-slot rounded-lg w-14 h-14 flex flex-col items-center justify-center relative">
              <span className="text-xl leading-none">
                {b.kind === 'cross' ? <span className="text-red-500 font-black text-lg">✚</span> : b.emoji}
              </span>
              <span className="mc-font text-[11px] font-bold text-white/90" key={loot[b.kind]}>
                {loot[b.kind]}
              </span>
              {b.rare && <span className="absolute -top-1 -right-1 text-[10px]">✨</span>}
            </div>
          ))}
          <div className="mc-slot rounded-lg w-20 h-14 flex flex-col items-center justify-center">
            <span className="mc-font text-[11px] text-white/60">GOLPES</span>
            <span className="mc-font text-sm font-black text-green-400">{hits}</span>
          </div>
          <div className="mc-slot rounded-lg w-20 h-14 flex flex-col items-center justify-center relative">
            <span className="mc-font text-[11px] text-white/60">SINC</span>
            <span className={`mc-font text-sm font-black ${syncing ? 'text-blue-300 [animation:mc-hintpulse_.8s_ease-in-out_infinite]' : pendingRef.current > 0 ? 'text-yellow-300' : 'text-green-400'}`}>
              {syncing ? '…' : pendingRef.current > 0 ? `${pendingRef.current}⏳` : 'OK ☁'}
            </span>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-white/45 leading-relaxed px-4">
          Blocos raros 💎✚ dão mais gemas • 400 golpes/dia • Cada golpe vira Joy Coins
          no servidor (taxa por nível) • Funciona offline — sincroniza sozinho
        </p>
      </div>

      {/* Level up — overlay global */}
      {levelUpTo !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setLevelUpTo(null)}>
          <div className="text-center px-8">
            <div className="text-7xl mb-2 [animation:mc-levelpop_.6s_ease-out]">🎉</div>
            <h2 className="mc-font text-4xl font-black text-yellow-300 [animation:mc-levelpop_.6s_ease-out_.1s_both]">
              NÍVEL {levelUpTo}!
            </h2>
            <p className="mt-3 text-white/85 text-sm flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              Taxa de mineração aumentada — mais Joy Coins por golpe!
            </p>
            <p className="mt-4 text-white/50 text-xs">(toca para continuar)</p>
          </div>
        </div>
      )}

      {/* Vinheta da caverna */}
      <div className="pointer-events-none fixed inset-0 z-0 [animation:mc-vignette_5s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,.5) 100%)' }} aria-hidden />
    </div>
  );
}
