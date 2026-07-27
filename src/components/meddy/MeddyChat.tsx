/**
 * MeddyChat — Floating conversational AI coach
 * Task #24
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Sparkles, Phone, AlertTriangle,
  ChevronRight, Loader2, Heart, Calendar, Pill, Stethoscope,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useCountry } from '@/contexts/CountryContext';
import {
  startConversation, sendMessage, getConversationHistory,
  endConversation, getCrisisResource, getQuickReplies,
  type MeddyMessage,
} from '@/services/meddyCoach';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function MeddyChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, country } = useCountry();
  const language = country?.id === 'BR' ? 'pt' :
                   country?.id === 'IN' ? 'hi' :
                   country?.id === 'KE' ? 'sw' :
                   country?.id === 'ZA' ? 'af' :
                   country?.id === 'ET' ? 'am' :
                   'pt';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MeddyMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [crisisBanner, setCrisisBanner] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation history when opening
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    if (!user) return;
    if (!conversationId) {
      try {
        const conv = await startConversation(user.id, 'general', language);
        setConversationId(conv.id);
        // Welcome message
        const welcome: MeddyMessage = {
          id: 'welcome',
          conversation_id: conv.id,
          role: 'assistant',
          content: t('meddyCoach.welcome_message'),
          is_crisis_flagged: false,
          created_at: new Date().toISOString(),
        };
        setMessages([welcome]);
        setShowMoodPicker(true);
      } catch (err) {
        console.error('Failed to start conversation:', err);
        toast.error(t('common.error'));
      }
    }
  }, [user, conversationId, language, t]);

  const handleSend = useCallback(async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || !conversationId || loading) return;

    setInput('');
    setLoading(true);

    // Optimistic: add user message
    const optimisticUser: MeddyMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      role: 'user',
      content: text,
      is_crisis_flagged: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUser]);

    try {
      const reply = await sendMessage(conversationId, text, language);

      // Replace optimistic, add reply
      setMessages(prev => [...prev.filter(m => m.id !== optimisticUser.id), {
        id: 'temp-user-' + Date.now(),
        conversation_id: conversationId,
        role: 'user',
        content: text,
        is_crisis_flagged: reply.is_crisis_flagged,
        created_at: new Date().toISOString(),
      } as MeddyMessage, reply]);

      if (reply.is_crisis_flagged) {
        setCrisisBanner(true);
      }
    } catch (err) {
      console.error('Send message error:', err);
      toast.error(t('meddyCoach.error_sending'));
    } finally {
      setLoading(false);
    }
  }, [input, conversationId, loading, language, t]);

  const handleClose = useCallback(async () => {
    if (conversationId) {
      // Show mood picker for after-conversation rating
      setShowMoodPicker(true);
    }
    setIsOpen(false);
  }, [conversationId]);

  const handleMoodSelect = useCallback(async (mood: number) => {
    setMoodBefore(mood);
    setShowMoodPicker(false);
    if (conversationId && !isOpen) {
      // Ending conversation
      await endConversation(conversationId, mood, mood);
      toast.success(t('meddyCoach.conversation_ended'));
      setConversationId(null);
      setMessages([]);
    }
  }, [conversationId, isOpen, t]);

  const crisisResource = crisisBanner ? getCrisisResource(country?.id || '') : null;

  const quickReplies = getQuickReplies(language);

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOpen}
            aria-label={t('meddyCoach.open_aria')}
            className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-premium flex items-center justify-center min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-primary"
              style={{ zIndex: -1 }}
              aria-hidden="true"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 h-[80vh] md:h-full bg-background border-t md:border-t-0 md:border-l shadow-premium flex flex-col"
            role="dialog"
            aria-label={t('meddyCoach.dialog_label')}
          >
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-secondary/10 flex items-center gap-3 min-h-[64px]">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-background" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-black text-sm flex items-center gap-1">
                  Meddy
                  <Heart className="h-3 w-3 fill-secondary text-secondary" aria-hidden="true" />
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  {t('meddyCoach.online_now')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label={t('common.close')}
                className="min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Crisis banner */}
            <AnimatePresence>
              {crisisBanner && crisisResource && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-50 dark:bg-red-950/30 border-b-2 border-red-200 dark:border-red-800 overflow-hidden"
                  role="alert"
                >
                  <div className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5 animate-pulse" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-red-700 dark:text-red-300">
                        {t('meddyCoach.crisis_banner_title')}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {t('meddyCoach.crisis_banner_desc')}
                      </p>
                      <div className="mt-2 p-2 bg-white dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs font-bold">{crisisResource.hotline_name}</p>
                        <a
                          href={`tel:${crisisResource.phone}`}
                          className="flex items-center gap-1 text-sm font-black text-red-600 dark:text-red-400 mt-1 min-h-[44px]"
                        >
                          <Phone className="h-4 w-4" aria-hidden="true" />
                          {crisisResource.phone}
                        </a>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {crisisResource.hours} · {crisisResource.languages.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mood picker (start/end) */}
            <AnimatePresence>
              {showMoodPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-violet-50 dark:bg-violet-950/30 border-b border-violet-200 dark:border-violet-800 overflow-hidden"
                >
                  <div className="p-4">
                    <p className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-2 text-center">
                      {moodBefore ? t('meddyCoach.mood_after_label') : t('meddyCoach.mood_before_label')}
                    </p>
                    <div className="flex justify-center gap-2">
                      {[
                        { level: 1, emoji: '😞' },
                        { level: 2, emoji: '😕' },
                        { level: 3, emoji: '😐' },
                        { level: 4, emoji: '😊' },
                        { level: 5, emoji: '😄' },
                      ].map(m => (
                        <button
                          key={m.level}
                          onClick={() => handleMoodSelect(m.level)}
                          className="text-2xl p-2 rounded-xl hover:bg-white dark:hover:bg-violet-900/30 transition-colors min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                          aria-label={`${t('meddyCoach.mood_label')}: ${m.level}/5`}
                        >
                          {m.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-3"
              role="log"
              aria-live="polite"
              aria-label={t('meddyCoach.messages_aria')}
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                  className={cn(
                    'flex gap-2 max-w-[85%]',
                    msg.role === 'user' && 'ml-auto flex-row-reverse'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : msg.is_crisis_flagged
                        ? 'bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-100 rounded-bl-sm border border-red-200 dark:border-red-800'
                        : 'bg-muted rounded-bl-sm'
                    )}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-2 max-w-[85%]">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
                    <motion.span
                      animate={{ scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                    />
                    <motion.span
                      animate={{ scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                    />
                    <motion.span
                      animate={{ scale: [0.8, 1, 0.8] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Suggested actions from last assistant message */}
              {messages.length > 0 && messages[messages.length - 1]?.suggested_actions?.length ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {messages[messages.length - 1].suggested_actions!.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => action.url && navigate(action.url)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {action.type === 'book_appointment' && <Calendar className="h-3 w-3" aria-hidden="true" />}
                      {action.type === 'view_medications' && <Pill className="h-3 w-3" aria-hidden="true" />}
                      {action.type === 'emergency_sos' && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
                      {action.label}
                      <ChevronRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* Quick replies (when few messages) */}
              {messages.length <= 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {quickReplies.map((reply, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(reply)}
                      className="px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/20 transition-colors min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t bg-background flex items-end gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={t('meddyCoach.input_placeholder')}
                aria-label={t('meddyCoach.input_aria')}
                className="flex-1 min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                disabled={loading}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                aria-label={t('meddyCoach.send_aria')}
                className="min-h-[44px] min-w-[44px] px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
