import { Search, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SearchBar() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/search")}
      className="relative cursor-pointer group"
    >
      <div className="glass rounded-2xl border border-border/50 overflow-hidden transition-all group-hover:shadow-medium group-hover:border-primary/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Search className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <span className="text-muted-foreground text-sm">
              Pesquisar restaurantes, produtos...
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
