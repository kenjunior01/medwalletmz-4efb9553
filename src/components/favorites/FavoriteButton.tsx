import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  variant?: 'default' | 'overlay';
  size?: 'sm' | 'default';
  className?: string;
}

export function FavoriteButton({ 
  isFavorite, 
  onToggle, 
  variant = 'default',
  size = 'default',
  className 
}: FavoriteButtonProps) {
  const isOverlay = variant === 'overlay';
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "rounded-full transition-all",
        isOverlay && "bg-background/80 backdrop-blur-sm hover:bg-background/90",
        size === 'sm' && "h-8 w-8",
        className
      )}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      <Heart 
        className={cn(
          size === 'sm' ? "h-4 w-4" : "h-5 w-5",
          "transition-all",
          isFavorite && "fill-red-500 text-red-500"
        )} 
      />
    </Button>
  );
}
