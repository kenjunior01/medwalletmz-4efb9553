import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

export function SafeImage({ src, alt, fallbackSrc = '/placeholder.svg', ...props }: SafeImageProps) {
    const [imgSrc, setImgSrc] = useState<string | undefined>(src);

    useEffect(() => {
        let ignore = false;

        const resolveSrc = async () => {
            const nextSrc = typeof src === 'string' ? src.trim() : '';
            if (!nextSrc) {
                if (!ignore) setImgSrc(fallbackSrc);
                return;
            }

            if (/^(https?:|data:|\/)/i.test(nextSrc)) {
                if (!ignore) setImgSrc(nextSrc);
                return;
            }

            try {
                const { data } = await supabase.storage.from('licenses').createSignedUrl(nextSrc, 60 * 60 * 24 * 365);
                if (!ignore) setImgSrc(data?.signedUrl || fallbackSrc);
            } catch {
                if (!ignore) setImgSrc(fallbackSrc);
            }
        };

        void resolveSrc();
        return () => { ignore = true; };
    }, [src, fallbackSrc]);

    const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
        if (imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
            return;
        }
        const target = event.currentTarget as HTMLImageElement;
        target.onerror = null;
        target.src = fallbackSrc;
    };

    return <img {...props} src={imgSrc} alt={alt} onError={handleError} />;
}
