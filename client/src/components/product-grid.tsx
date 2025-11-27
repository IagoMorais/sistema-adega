import { Product } from "@shared/schema";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Minus, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CachedImage } from "@/components/ui/cached-image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/use-auth";

interface ProductGridProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  onProductDeselect?: (productId: number) => void;
  selectedQuantities?: Record<number, number>;
}

export function ProductGrid({
  products,
  onProductSelect,
  onProductDeselect,
  selectedQuantities = {},
}: ProductGridProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>({
    search: "",
    priceRange: [0, 1000],
    brands: [],
    onlyDiscounted: false,
    inStock: false,
  });

  const longPressTimer = useRef<NodeJS.Timeout>();
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressProductId, setLongPressProductId] = useState<number | null>(null);
  const [itemToRemove, setItemToRemove] = useState<number | null>(null);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const LONG_PRESS_DURATION = 800; // duração da pressão longa em ms

  useEffect(() => {
    if (products?.length > 0) {
      const prices = products.map((p) => Number(p.price));
      const minPrice = Math.floor(Math.min(...prices));
      const maxPrice = Math.ceil(Math.max(...prices));
      setFilters((prev) => ({
        ...prev,
        priceRange: [minPrice, maxPrice],
      }));
    }
  }, [products]);

  const uniqueBrands = Array.from(new Set(products?.map((p) => p.brand) || []));

  const handleTouchStart = useCallback(
    (productId: number) => {
      if (!selectedQuantities[productId]) return;

      // Inicia o timer de pressão longa
      startTimeRef.current = Date.now();
      setLongPressProductId(productId);
      
      // Configura animação de progresso
      const updateProgress = () => {
        const elapsedTime = Date.now() - startTimeRef.current;
        const progress = Math.min(100, (elapsedTime / LONG_PRESS_DURATION) * 100);
        setLongPressProgress(progress);
        
        if (progress < 100) {
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
          // Quando completar 100%, ativa a ação de pressão longa
          setIsLongPressing(true);
          setItemToRemove(productId);
          
          // Vibra o dispositivo se suportado (vibração mais perceptível)
          if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(200);
          }
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updateProgress);
      
      // Mantém o timer antigo para compatibilidade
      longPressTimer.current = setTimeout(() => {
        setIsLongPressing(true);
        setItemToRemove(productId);
      }, LONG_PRESS_DURATION);
    },
    [selectedQuantities],
  );

  const handleConfirmedRemove = () => {
    if (itemToRemove !== null && onProductDeselect) {
      onProductDeselect(itemToRemove);
      setItemToRemove(null);
    }
  };

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setLongPressProgress(0);
    setLongPressProductId(null);
    setIsLongPressing(false);
  }, []);

  const calculateDiscountedPrice = (
    price: string | number,
    discount: string | number,
  ) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    const numDiscount =
      typeof discount === "string" ? parseFloat(discount) : discount;
    return numPrice - numPrice * (numDiscount / 100);
  };

  const filteredProducts = products?.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      product.brand.toLowerCase().includes(filters.search.toLowerCase());

    const price = Number(product.price);
    const matchesPrice =
      price >= filters.priceRange[0] && price <= filters.priceRange[1];

    const matchesBrand =
      filters.brands.length === 0 || filters.brands.includes(product.brand);

    const matchesDiscount =
      !filters.onlyDiscounted || Number(product.discount) > 0;

    const matchesStock = !filters.inStock || product.quantity > 0;

    return (
      matchesSearch &&
      matchesPrice &&
      matchesBrand &&
      matchesDiscount &&
      matchesStock
    );
  });

  return (
    <div className="space-y-3">
      <Dialog
        open={itemToRemove !== null}
        onOpenChange={(isOpen) => setItemToRemove(isOpen ? itemToRemove : null)}
      >
        <DialogContent>
          <DialogTitle>Remover Item</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover este item do carrinho?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToRemove(null)}>
              Cancelar
            </Button>
            <Button variant="default" onClick={handleConfirmedRemove}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar produtos..."
            className="pl-8 h-9 text-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Faixa de Preço</Label>
                <div className="pt-2">
                  <Slider
                    min={0}
                    max={1000}
                    step={1}
                    value={filters.priceRange}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceRange: value as [number, number],
                      }))
                    }
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span> {filters.priceRange[1]}</span>
                  <span> {filters.priceRange[0]}</span>
                </div>
              </div>

              {user?.role === "admin" && (
                <div className="space-y-2">
                  <Label>Marcas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {uniqueBrands.map((brand) => (
                      <div key={brand} className="flex items-center space-x-2">
                        <Checkbox
                          id={brand}
                          checked={filters.brands.includes(brand)}
                          onCheckedChange={(checked) => {
                            setFilters((prev) => ({
                              ...prev,
                              brands: checked
                                ? [...prev.brands, brand]
                                : prev.brands.filter((b) => b !== brand),
                            }));
                          }}
                        />
                        <label
                          htmlFor={brand}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {brand}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="discounted"
                  checked={filters.onlyDiscounted}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({
                      ...prev,
                      onlyDiscounted: checked as boolean,
                    }))
                  }
                />
                <label
                  htmlFor="discounted"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Apenas produtos com desconto
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inStock"
                  checked={filters.inStock}
                  onCheckedChange={(checked) =>
                    setFilters((prev) => ({
                      ...prev,
                      inStock: checked as boolean,
                    }))
                  }
                />
                <label
                  htmlFor="inStock"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Apenas produtos em estoque
                </label>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setFilters({
                    search: "",
                    priceRange: [0, 1000],
                    brands: [],
                    onlyDiscounted: false,
                    inStock: false,
                  })
                }
              >
                Limpar Filtros
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-7 lg:grid-cols-14 gap-2 sm:gap-1">
        {filteredProducts?.map((product) => (
          <Card
            key={product.id}
            className={`cursor-pointer transition-all hover:scale-102 active:scale-98 relative select-none ${
              product.quantity === 0 ? "opacity-50" : ""
            } ${longPressProductId === product.id ? "ring-2 ring-primary shadow-lg" : ""}`}
            style={{ 
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              userSelect: 'none'
            }}
            onClick={() => {
              if (product.quantity > 0 && !isLongPressing) {
                onProductSelect(product);
              }
            }}
            onTouchStart={() => handleTouchStart(product.id)}
            onTouchEnd={handleTouchEnd}
            onMouseDown={() => handleTouchStart(product.id)}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
          >
            {selectedQuantities[product.id] > 0 && (
              <>
                <Badge
                  variant="secondary"
                  className="absolute -top-1.5 -right-1.5 z-10 text-xs px-1.5 py-0.5 min-w-[1.5rem] text-center"
                >
                  {selectedQuantities[product.id]}
                </Badge>
                
                {/* Indicador de progresso da pressão longa */}
                {longPressProductId === product.id && longPressProgress > 0 && (
                  <div className="absolute inset-0 overflow-hidden rounded-md pointer-events-none z-20">
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-primary/40 transition-all duration-100 ease-linear"
                      style={{ 
                        height: `${longPressProgress}%`
                      }}
                    />
                  </div>
                )}
              </>
            )}
            <CardContent className="p-2 sm:p-3">
              {product.imageUrl && (
                <div className="relative w-full aspect-square mb-2 rounded-md overflow-hidden">
                  <CachedImage
                    src={product.imageUrl}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <div className="text-xs sm:text-sm font-semibold line-clamp-2">
                {product.name}
              </div>
              {user?.role === "admin" && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {product.brand}
                </div>
              )}
              <div className="mt-1 sm:mt-1.5">
                <div className="text-xs sm:text-sm font-medium">
                   {Number(product.price).toFixed(2)}
                </div>
              </div>
              <div
                className={`mt-0.5 text-xs ${
                  product.quantity === 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {product.quantity === 0 && "0"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface Filters {
  search: string;
  priceRange: [number, number];
  brands: string[];
  onlyDiscounted: boolean;
  inStock: boolean;
}
