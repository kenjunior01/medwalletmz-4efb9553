import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  colorClass: string;
  bgClass: string;
}

export function ServiceCard({
  title,
  description,
  icon: Icon,
  href,
  colorClass,
  bgClass,
}: ServiceCardProps) {
  return (
    <Link
      to={href}
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-medium active:scale-[0.98]",
        bgClass
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={cn("font-bold text-lg", colorClass)}>{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div
          className={cn(
            "p-3 rounded-xl",
            colorClass.replace("text-", "bg-").replace("-foreground", "") + "/20"
          )}
        >
          <Icon className={cn("h-6 w-6", colorClass)} />
        </div>
      </div>
      
      {/* Decorative element */}
      <div
        className={cn(
          "absolute -bottom-4 -right-4 h-20 w-20 rounded-full opacity-10",
          colorClass.replace("text-", "bg-").replace("-foreground", "")
        )}
      />
    </Link>
  );
}
