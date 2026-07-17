import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCountry } from '@/contexts/CountryContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalDocs() {
  const { type } = useParams();
  const { country, locale } = useCountry();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDoc() {
      if (!country?.id) return;
      setLoading(true);
      try {
        // Try to find the doc for specific country and language
        let { data } = await supabase
          .from('legal_documents' as any)
          .select('content')
          .eq('country_id', country.id)
          .eq('type', type || 'terms_of_service')
          .eq('language_code', locale)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle() as any;

        // Fallback to English if not found in user language
        if (!data) {
          const { data: fallback } = await supabase
            .from('legal_documents' as any)
            .select('content')
            .eq('country_id', country.id)
            .eq('type', type || 'terms_of_service')
            .eq('language_code', 'en')
            .limit(1)
            .maybeSingle() as any;
          data = fallback;
        }

        setContent(data?.content || 'Document not found for this region.');
      } catch (e) {
        console.error("Error fetching legal doc:", e);
        setContent('Error loading document.');
      } finally {
        setLoading(false);
      }
    }

    fetchDoc();
  }, [country, type, locale]);

  return (
    <div className="min-h-screen bg-background p-6">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-bold capitalize">
          {type?.replace(/_/g, ' ') || 'Legal'}
        </h1>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
        </div>
      ) : (
        <article className="prose prose-sm dark:prose-invert max-w-none">
          {/* We would use a markdown renderer here like react-markdown */}
          <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
        </article>
      )}
    </div>
  );
}
