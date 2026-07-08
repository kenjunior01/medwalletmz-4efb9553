import { useEffect, useState } from 'react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallbackSrc?: string;
}

export function SafeImage({ src, alt, fallbackSrc = '/placeholder.svg', ...props }: SafeImageProps) {
    const [imgSrc, setImgSrc] = useState<string | undefined>(src);

    useEffect(() => {
        setImgSrc(src);
    }, [src]);

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
