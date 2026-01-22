import { useState } from "react";
import { Search as SearchIcon, TrendingUp, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const trendingSearches = [
  "Pizza",
  "Frango",
  "Sushi",
  "Hambúrguer",
  "Comida Moçambicana",
];

const recentSearches = ["Arroz", "Pão", "Leite"];

export default function Search() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-6 p-4 animate-fade-in">
      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar restaurantes, produtos..."
          className="pl-10 pr-10 h-12 rounded-xl text-base"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Pesquisas Recentes</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search) => (
              <Badge
                key={search}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => setQuery(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Em Alta</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {trendingSearches.map((search, index) => (
            <Badge
              key={search}
              variant="outline"
              className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors gap-1"
              onClick={() => setQuery(search)}
            >
              <span className="text-primary font-bold">{index + 1}</span>
              {search}
            </Badge>
          ))}
        </div>
      </section>

      {/* Search Results Placeholder */}
      {query && (
        <section>
          <h2 className="font-semibold text-sm mb-3">
            Resultados para "{query}"
          </h2>
          <div className="text-center py-12 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Pesquisando...</p>
          </div>
        </section>
      )}
    </div>
  );
}
