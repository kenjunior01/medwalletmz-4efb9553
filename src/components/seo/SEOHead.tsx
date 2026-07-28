import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  type?: 'website' | 'article' | 'profile';
  image?: string;
}

export function SEOHead({
  title = 'MedWallet — Saúde, Farmácia e Veterinária',
  description = 'Plataforma integrada de saúde, farmácia e veterinária com pagamentos localizados em Moçambique.',
  path = '/',
  type = 'website',
  image = 'https://medwalletmz.online/og-image.png',
}: SEOHeadProps) {
  const url = `https://medwalletmz.online${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
