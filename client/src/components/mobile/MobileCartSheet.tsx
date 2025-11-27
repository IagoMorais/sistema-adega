import { useState, useRef } from "react";
import { Plus, Minus, Trash2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CartItem } from "@/hooks/use-cart";
import { PaymentSelector, Payment } from "./PaymentSelector";

interface MobileCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onIncrementQuantity: (productId: number) => void;
  onDecrementQuantity: (productId: number) => void;
  onRemoveItem: (productId: number) => void;
  totalAmount: number;
  onCheckout: (payments: Payment[], mode: "single" | "split") => void;
  isProcessing: boolean;
}

export function MobileCartSheet({
  open,
  onOpenChange,
  cart,
  onIncrementQuantity,
  onDecrementQuantity,
  onRemoveItem,
  totalAmount,
  onCheckout,
  isProcessing,
}: MobileCartSheetProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [longPressActive, setLongPressActive] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    if (paymentMode === "split") {
      // Validar pagamentos divididos
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - totalAmount) > 0.01) {
        return;
      }
      if (payments.length < 2) {
        return;
      }
    }

    onCheckout(payments, paymentMode);
  };

  const canCheckout = () => {
    if (cart.length === 0 || isProcessing) return false;
    
    if (paymentMode === "single") {
      return payments.length > 0;
    }
    
    // Modo split
    if (payments.length < 2) return false;
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.abs(totalPaid - totalAmount) < 0.01;
  };

  // Funções para detecção de pressionar e segurar
  const handleLongPressStart = (productId: number, event: React.TouchEvent | React.MouseEvent) => {
    // Prevenir que cliques em botões ativem o long press
    const target = event.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }

    // Salvar posição inicial do toque
    if ('touches' in event) {
      touchStartPos.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    } else {
      touchStartPos.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }

    setLongPressActive(productId);
    longPressTimerRef.current = setTimeout(() => {
      setSelectedProductId(productId);
      setConfirmDialogOpen(true);
      setLongPressActive(null);
      touchStartPos.current = null;
    }, 600); // 600ms - tempo balanceado
  };

  const handleLongPressMove = (event: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPos.current || !longPressTimerRef.current) return;

    // Calcular distância do movimento
    let currentX: number, currentY: number;
    if ('touches' in event) {
      currentX = event.touches[0].clientX;
      currentY = event.touches[0].clientY;
    } else {
      currentX = event.clientX;
      currentY = event.clientY;
    }

    const deltaX = Math.abs(currentX - touchStartPos.current.x);
    const deltaY = Math.abs(currentY - touchStartPos.current.y);
    
    // Se moveu mais de 10px, cancelar long press (permite pequenos movimentos)
    if (deltaX > 10 || deltaY > 10) {
      handleLongPressEnd();
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setLongPressActive(null);
    touchStartPos.current = null;
  };

  const handleConfirmRemove = () => {
    if (selectedProductId !== null) {
      onRemoveItem(selectedProductId);
      setSelectedProductId(null);
    }
    setConfirmDialogOpen(false);
  };

  return (
    <>
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item do carrinho?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho ({cart.length} {cart.length === 1 ? "item" : "itens"})
          </SheetTitle>
          <SheetDescription>
            Revise seus itens e escolha a forma de pagamento
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Lista de itens */}
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 pb-4">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                cart.map((item) => (
                    <div
                      key={item.product.id}
                      className={`rounded-lg border bg-card transition-all select-none ${
                        longPressActive === item.product.id 
                          ? 'scale-[0.98] bg-destructive/10 border-destructive' 
                          : 'hover:bg-accent/50'
                      }`}
                      style={{ 
                        touchAction: longPressActive === item.product.id ? 'none' : 'auto',
                        WebkitUserSelect: 'none',
                        userSelect: 'none'
                      }}
                      onTouchStart={(e) => handleLongPressStart(item.product.id, e)}
                      onTouchEnd={handleLongPressEnd}
                      onTouchMove={handleLongPressMove}
                      onTouchCancel={handleLongPressEnd}
                      onMouseDown={(e) => handleLongPressStart(item.product.id, e)}
                      onMouseUp={handleLongPressEnd}
                      onMouseMove={handleLongPressMove}
                      onMouseLeave={handleLongPressEnd}
                    >
                    <div className="p-3 space-y-2">
                      {/* Informações do produto */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-1 text-sm">
                            {item.product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.product.brand}
                          </p>
                        </div>
                        <p className="font-bold text-sm whitespace-nowrap">
                          R$ {Number(item.product.price).toFixed(2)}
                        </p>
                      </div>

                      {/* Controles de quantidade e remoção */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => onDecrementQuantity(item.product.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <span className="w-10 text-center font-medium text-sm">
                            {item.quantity}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => onIncrementQuantity(item.product.id)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onRemoveItem(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Seção de pagamento e checkout */}
          {cart.length > 0 && (
            <div className="border-t bg-background p-6 space-y-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Subtotal</span>
                <span>R$ {totalAmount.toFixed(2)}</span>
              </div>

              <Separator />

              <PaymentSelector
                totalAmount={totalAmount}
                onPaymentsChange={setPayments}
                onModeChange={setPaymentMode}
              />

              <Button
                size="lg"
                className="w-full"
                onClick={handleCheckout}
                disabled={!canCheckout()}
              >
                {isProcessing
                  ? "Processando..."
                  : `Finalizar Venda - R$ ${totalAmount.toFixed(2)}`}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
