import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface CategoryItemProps {
  icon: LucideIcon;
  label: string;
  colorClass: string;
  onClick?: () => void;
}

export function CategoryItem({ icon: Icon, label, colorClass, onClick }: CategoryItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-2 min-w-[72px] transition-transform active:scale-95"
    >
      <div
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center",
          colorClass.replace("text-", "bg-") + "/15"
        )}
      >
        <Icon className={cn("h-6 w-6", colorClass)} />
      </div>
      <span className="text-xs font-medium text-foreground text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
