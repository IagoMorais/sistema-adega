import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FloatingCartButtonProps {
  itemCount: number;
  totalAmount: number;
  onClick: () => void;
  className?: string;
}

export function FloatingCartButton({
  itemCount,
  totalAmount,
  onClick,
  className,
}: FloatingCartButtonProps) {
  if (itemCount === 0) return null;

  return (
    <Button
      size="lg"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-16 rounded-full shadow-lg px-6 gap-3 bg-blue-600 hover:bg-blue-700 text-white",
        "animate-in slide-in-from-bottom-8 duration-300",
        className
      )}
      onClick={onClick}
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6" />
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs opacity-90">Carrinho</span>
        <span className="font-bold">R$ {totalAmount.toFixed(2)}</span>
      </div>
    </Button>
  );
}
