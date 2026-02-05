import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Zap, Gift, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const banners = [
  {
    id: 1,
    title: "Primeira Entrega Grátis!",
    subtitle: "Use o código BEMVINDO10",
    icon: Gift,
    bgGradient: "gradient-premium",
  },
  {
    id: 2,
    title: "Supermercado em Casa",
    subtitle: "Entrega em 1 hora",
    icon: Truck,
    bgGradient: "bg-gradient-to-r from-grocery to-emerald-600",
  },
  {
    id: 3,
    title: "Farmácia 24h",
    subtitle: "Medicamentos quando precisar",
    icon: Zap,
    bgGradient: "bg-gradient-to-r from-pharmacy to-blue-600",
  },
];

export function PromoBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl shadow-premium">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner) => {
            const Icon = banner.icon;
            return (
              <div
                key={banner.id}
                className={cn(
                  "min-w-full h-40 p-6 flex flex-col justify-center relative overflow-hidden",
                  banner.bgGradient
                )}
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-10 -translate-y-10" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-xl -translate-x-8 translate-y-8" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                      Oferta Especial
                    </span>
                  </div>
                  <h2 className="text-white text-xl font-extrabold">{banner.title}</h2>
                  <p className="text-white/90 text-sm mt-1">{banner.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goToPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all hover:scale-105 shadow-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all hover:scale-105 shadow-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300 shadow-sm",
              index === currentIndex
                ? "w-8 bg-white"
                : "w-2 bg-white/50 hover:bg-white/70"
            )}
          />
        ))}
      </div>
    </div>
  );
}
