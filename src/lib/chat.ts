import { supabase } from '@/integrations/supabase/client';

export type ThreadKind = 'direct' | 'consultation' | 'delivery' | 'institution' | 'support';

export interface ChatThread {
  id: string;
  kind: ThreadKind;
  title: string | null;
  context_type: string | null;
  context_id: string | null;
  created_by: string;
  last_message: string | null;
  last_message_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  kind: string;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  metadata: any;
  created_at: string;
}

/** Abre (ou cria) uma conversa directa com outro utilizador. Devolve o thread_id. */
export async function openThreadWith(
  otherUserId: string,
  opts?: { kind?: ThreadKind; contextType?: string; contextId?: string; title?: string },
): Promise<string> {
  const { data, error } = await (supabase as any).rpc('get_or_create_direct_thread', {
    _other: otherUserId,
    _kind: opts?.kind ?? 'direct',
    _context_type: opts?.contextType ?? null,
    _context_id: opts?.contextId ?? null,
    _title: opts?.title ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function markThreadRead(threadId: string, userId: string) {
  await (supabase as any)
    .from('chat_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .eq('user_id', userId);
}

/** Faz upload de um ficheiro da conversa e devolve um URL assinado (30 dias). */
export async function uploadChatFile(userId: string, threadId: string, file: File | Blob, fileName: string) {
  const path = `${userId}/chat/${threadId}/${Date.now()}-${fileName}`;
  const { error } = await supabase.storage.from('consultation-attachments').upload(path, file);
  if (error) throw error;
  const { data } = await supabase.storage.from('consultation-attachments').createSignedUrl(path, 60 * 60 * 24 * 30);
  return { path, url: data?.signedUrl || path };
}
