import { supabase } from '@/integrations/supabase/client';

export async function uploadImageToStorage(file: File, options?: { bucket?: string; folder?: string }) {
    const bucket = options?.bucket ?? 'licenses';
    const folder = options?.folder ?? 'place-images';

    if (!file) throw new Error('Nenhum ficheiro selecionado');
    if (file.size > 10 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 10 MB');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
    });

    if (error) throw error;
    return path;
}
