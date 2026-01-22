import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

export function SearchBar() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/search")}
      className="relative cursor-pointer"
    >
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        readOnly
        placeholder="Pesquisar restaurantes, produtos..."
        className="pl-10 bg-muted/50 border-0 h-11 rounded-xl cursor-pointer"
      />
    </div>
  );
}
