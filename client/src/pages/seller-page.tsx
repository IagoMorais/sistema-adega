import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Product, paymentMethods, Sale } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/hooks/use-cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Minus, Trash2, ShoppingCart, Edit, History } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { FloatingCartButton } from "@/components/mobile/FloatingCartButton";
import { MobileCartSheet } from "@/components/mobile/MobileCartSheet";
import type { Payment } from "@/components/mobile/PaymentSelector";

export default function SellerPage() {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const {
        cart,
        addToCart,
        removeFromCart,
        incrementQuantity,
        decrementQuantity,
        clearCart,
        getTotalAmount,
        getTotalItems,
    } = useCart();

    const [searchTerm, setSearchTerm] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<string>("cash");
    const [editingSale, setEditingSale] = useState<Sale | null>(null);
    const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
    const [cartSheetOpen, setCartSheetOpen] = useState(false);
    
    // Long press states (desktop)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const [longPressActive, setLongPressActive] = useState<number | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPos = useRef<{ x: number; y: number } | null>(null);
    
    // Long press para produtos (grid)
    const [productToRemove, setProductToRemove] = useState<number | null>(null);
    const [longPressActiveProduct, setLongPressActiveProduct] = useState<number | null>(null);
    const longPressTimerProductRef = useRef<NodeJS.Timeout | null>(null);
    const touchStartPosProduct = useRef<{ x: number; y: number } | null>(null);

    const { data: products } = useQuery<Product[]>({
        queryKey: ["/api/products"],
    });

    const { data: recentSales } = useQuery<Sale[]>({
        queryKey: ["/api/sales"],
        refetchInterval: 30000,
    });

    const filteredProducts = products?.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = getTotalAmount();

    const checkoutMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/sales", {
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                })),
                paymentMethod,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Erro ao realizar venda");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Venda realizada!",
                description: `Total: R$ ${totalAmount.toFixed(2)}`,
            });
            clearCart();
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro na venda",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const checkoutSplitMutation = useMutation({
        mutationFn: async (payments: Payment[]) => {
            const res = await apiRequest("POST", "/api/sales-split", {
                items: cart.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                })),
                payments: payments.map(p => ({
                    paymentMethod: p.paymentMethod,
                    amount: p.amount,
                })),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Erro ao realizar venda");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Venda realizada!",
                description: `Total: R$ ${totalAmount.toFixed(2)} (Pagamento Dividido)`,
            });
            clearCart();
            setCartSheetOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro na venda",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updatePaymentMutation = useMutation({
        mutationFn: async ({ saleId, paymentMethod }: { saleId: number; paymentMethod: string }) => {
            const res = await apiRequest("PATCH", `/api/sales/${saleId}/payment-method`, {
                paymentMethod,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Erro ao alterar forma de pagamento");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({
                title: "Forma de pagamento alterada!",
                description: "A alteração foi registrada com sucesso.",
            });
            setEditingSale(null);
            queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro ao alterar pagamento",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleEditPayment = (sale: Sale) => {
        setEditingSale(sale);
        setNewPaymentMethod(sale.paymentMethod);
    };

    const handleSavePaymentMethod = () => {
        if (editingSale && newPaymentMethod) {
            updatePaymentMutation.mutate({
                saleId: editingSale.id,
                paymentMethod: newPaymentMethod,
            });
        }
    };

    const handleMobileCheckout = (payments: Payment[], mode: "single" | "split") => {
        if (mode === "single") {
            setPaymentMethod(payments[0].paymentMethod);
            checkoutMutation.mutate();
        } else {
            checkoutSplitMutation.mutate(payments);
        }
    };

    // Long press handlers (desktop)
    const handleLongPressStart = (productId: number, event: React.TouchEvent | React.MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button')) {
            return;
        }

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
        }, 600);
    };

    const handleLongPressMove = (event: React.TouchEvent | React.MouseEvent) => {
        if (!touchStartPos.current || !longPressTimerRef.current) return;

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
            removeFromCart(selectedProductId);
            setSelectedProductId(null);
        }
        setConfirmDialogOpen(false);
    };

    // Long press handlers para produtos (grid)
    const handleProductLongPressStart = (productId: number, event: React.TouchEvent | React.MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest('button')) {
            return;
        }

        if ('touches' in event) {
            touchStartPosProduct.current = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY,
            };
        } else {
            touchStartPosProduct.current = {
                x: event.clientX,
                y: event.clientY,
            };
        }

        setLongPressActiveProduct(productId);
        longPressTimerProductRef.current = setTimeout(() => {
            setProductToRemove(productId);
            setLongPressActiveProduct(null);
            touchStartPosProduct.current = null;
        }, 600);
    };

    const handleProductLongPressMove = (event: React.TouchEvent | React.MouseEvent) => {
        if (!touchStartPosProduct.current || !longPressTimerProductRef.current) return;

        let currentX: number, currentY: number;
        if ('touches' in event) {
            currentX = event.touches[0].clientX;
            currentY = event.touches[0].clientY;
        } else {
            currentX = event.clientX;
            currentY = event.clientY;
        }

        const deltaX = Math.abs(currentX - touchStartPosProduct.current.x);
        const deltaY = Math.abs(currentY - touchStartPosProduct.current.y);
        
        if (deltaX > 10 || deltaY > 10) {
            handleProductLongPressEnd();
        }
    };

    const handleProductLongPressEnd = () => {
        if (longPressTimerProductRef.current) {
            clearTimeout(longPressTimerProductRef.current);
            longPressTimerProductRef.current = null;
        }
        setLongPressActiveProduct(null);
        touchStartPosProduct.current = null;
    };

    const handleRemoveProduct = (productId: number) => {
        // Verifica se o item está no carrinho antes de remover
        const cartItem = cart.find((item) => item.product.id === productId);
        
        if (!cartItem) {
            setProductToRemove(null);
            toast({
                title: "Item não está no carrinho",
                description: "Este produto não está no carrinho.",
                variant: "destructive",
            });
            return;
        }
        
        // Remove do carrinho
        removeFromCart(productId);
        setProductToRemove(null);
        
        toast({
            title: "Item removido",
            description: "O item foi removido do carrinho.",
        });
    };

    // Mobile Layout
    return (
        <>
            {/* AlertDialogs compartilhados entre mobile e desktop */}
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

            <AlertDialog open={productToRemove !== null} onOpenChange={(open) => !open && setProductToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover do carrinho</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este produto do carrinho?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Não</AlertDialogCancel>
                        <AlertDialogAction onClick={() => productToRemove && handleRemoveProduct(productToRemove)}>
                            Sim, remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {isMobile ? (
                <>
                    <div className="flex flex-col h-[calc(100vh-4rem)] pb-24">
                        <div className="p-4 space-y-4">
                            <Input
                                placeholder="Buscar produtos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="flex-1 px-4">
                            <div className="grid grid-cols-2 gap-3 pb-4">
                                {filteredProducts?.map((product) => {
                                    const cartItem = cart.find((item) => item.product.id === product.id);
                                    const quantityInCart = cartItem?.quantity || 0;

                                    return (
                                        <Card
                                            key={product.id}
                                            className={`cursor-pointer transition-all hover:shadow-md active:scale-95 relative select-none ${
                                                longPressActiveProduct === product.id 
                                                    ? 'scale-[0.98] bg-destructive/10 border-destructive' 
                                                    : ''
                                            }`}
                                            style={{ 
                                                touchAction: longPressActiveProduct === product.id ? 'none' : 'auto',
                                                WebkitUserSelect: 'none',
                                                userSelect: 'none'
                                            }}
                                            onClick={() => addToCart(product)}
                                            onTouchStart={(e) => handleProductLongPressStart(product.id, e)}
                                            onTouchEnd={handleProductLongPressEnd}
                                            onTouchMove={handleProductLongPressMove}
                                            onTouchCancel={handleProductLongPressEnd}
                                            onMouseDown={(e) => handleProductLongPressStart(product.id, e)}
                                            onMouseUp={handleProductLongPressEnd}
                                            onMouseMove={handleProductLongPressMove}
                                            onMouseLeave={handleProductLongPressEnd}
                                        >
                                            {quantityInCart > 0 && (
                                                <Badge
                                                    className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full p-0 z-10"
                                                    variant="default"
                                                >
                                                    {quantityInCart}
                                                </Badge>
                                            )}
                                            <CardHeader className="p-3">
                                                <CardTitle className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                                                    {product.name}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 pt-0">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {product.brand}
                                                    </p>
                                                    <div className="flex justify-between items-end">
                                                        <p className="font-bold text-base">
                                                            R$ {Number(product.price).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Est: {product.quantity}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <FloatingCartButton
                        itemCount={getTotalItems()}
                        totalAmount={totalAmount}
                        onClick={() => setCartSheetOpen(true)}
                    />

                    <MobileCartSheet
                        open={cartSheetOpen}
                        onOpenChange={setCartSheetOpen}
                        cart={cart}
                        onIncrementQuantity={incrementQuantity}
                        onDecrementQuantity={decrementQuantity}
                        onRemoveItem={removeFromCart}
                        totalAmount={totalAmount}
                        onCheckout={handleMobileCheckout}
                        isProcessing={checkoutMutation.isPending || checkoutSplitMutation.isPending}
                    />
                </>
            ) : (
                <div className="grid h-[calc(100vh-4rem)] gap-6 md:grid-cols-[1fr_400px] lg:grid-cols-[1fr_400px_350px]">
            <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                    <Input
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-md"
                    />
                </div>

                <ScrollArea className="flex-1 rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {filteredProducts?.map((product) => {
                            const cartItem = cart.find((item) => item.product.id === product.id);
                            const quantityInCart = cartItem?.quantity || 0;
                            
                            return (
                                <Card
                                    key={product.id}
                                    className={`cursor-pointer transition-colors hover:bg-accent relative select-none ${
                                        longPressActiveProduct === product.id 
                                            ? 'scale-[0.98] bg-destructive/10 border-destructive' 
                                            : ''
                                    }`}
                                    style={{ 
                                        touchAction: longPressActiveProduct === product.id ? 'none' : 'auto',
                                        WebkitUserSelect: 'none',
                                        userSelect: 'none'
                                    }}
                                    onClick={() => addToCart(product)}
                                    onTouchStart={(e) => handleProductLongPressStart(product.id, e)}
                                    onTouchEnd={handleProductLongPressEnd}
                                    onTouchMove={handleProductLongPressMove}
                                    onTouchCancel={handleProductLongPressEnd}
                                    onMouseDown={(e) => handleProductLongPressStart(product.id, e)}
                                    onMouseUp={handleProductLongPressEnd}
                                    onMouseMove={handleProductLongPressMove}
                                    onMouseLeave={handleProductLongPressEnd}
                                >
                                    {quantityInCart > 0 && (
                                        <Badge 
                                            className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full p-0 bg-primary text-primary-foreground"
                                            variant="default"
                                        >
                                            {quantityInCart}
                                        </Badge>
                                    )}
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-sm font-medium">{product.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-muted-foreground">{product.brand}</p>
                                                <p className="font-bold">R$ {Number(product.price).toFixed(2)}</p>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                Est: {product.quantity}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Carrinho
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div 
                                    key={item.product.id} 
                                    className={`flex items-center justify-between gap-2 rounded-lg border p-2 transition-all select-none ${
                                        longPressActive === item.product.id 
                                            ? 'scale-[0.98] bg-destructive/10 border-destructive' 
                                            : ''
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
                                    <div className="flex-1">
                                        <p className="font-medium line-clamp-1">{item.product.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            R$ {Number(item.product.price).toFixed(2)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => decrementQuantity(item.product.id)}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-8 text-center">{item.quantity}</span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => incrementQuantity(item.product.id)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => removeFromCart(item.product.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {cart.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    Carrinho vazio
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="space-y-4 border-t pt-4">
                        <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span>R$ {totalAmount.toFixed(2)}</span>
                        </div>

                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Forma de Pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                                {paymentMethods.map((method) => (
                                    <SelectItem key={method} value={method}>
                                        {method.toUpperCase()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            className="w-full"
                            size="lg"
                            disabled={cart.length === 0 || checkoutMutation.isPending}
                            onClick={() => checkoutMutation.mutate()}
                        >
                            {checkoutMutation.isPending ? "Processando..." : "Finalizar Venda"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

                    {/* Vendas Recentes */}
                    <Card className="hidden lg:flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Vendas Recentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            <ScrollArea className="h-full pr-4">
                                <div className="space-y-3">
                                    {recentSales?.slice(0, 10).map((sale) => (
                                        <div
                                            key={sale.id}
                                            className="rounded-lg border p-3 space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">
                                                    Venda #{sale.id}
                                                </span>
                                                <Badge variant={sale.status === "active" ? "default" : "secondary"}>
                                                    {sale.status === "active" ? "Ativa" : "Cancelada"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Total:</span>
                                                <span className="font-semibold">
                                                    R$ {Number(sale.totalAmount).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Pagamento:</span>
                                                <span className="font-medium uppercase">
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {new Date(sale.createdAt).toLocaleString("pt-BR")}
                                            </div>
                                            {sale.status === "active" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => handleEditPayment(sale)}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Alterar Pagamento
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {(!recentSales || recentSales.length === 0) && (
                                        <div className="text-center text-muted-foreground py-8">
                                            Nenhuma venda realizada
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Dialog de Alteração de Pagamento (apenas desktop) */}
            <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Forma de Pagamento</DialogTitle>
                        <DialogDescription>
                            Venda #{editingSale?.id} - Total: R$ {Number(editingSale?.totalAmount || 0).toFixed(2)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Forma de Pagamento Atual</label>
                            <div className="p-3 rounded-md bg-muted">
                                <span className="font-semibold uppercase">
                                    {editingSale?.paymentMethod}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nova Forma de Pagamento</label>
                            <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods.map((method) => (
                                        <SelectItem key={method} value={method}>
                                            {method.toUpperCase()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingSale(null)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSavePaymentMethod}
                            disabled={updatePaymentMutation.isPending || newPaymentMethod === editingSale?.paymentMethod}
                        >
                            {updatePaymentMutation.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
