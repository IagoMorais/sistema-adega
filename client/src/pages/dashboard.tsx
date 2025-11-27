import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Product, Sale } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StockAlert } from "@/components/stock-alert";
import { DashboardStats } from "@/components/dashboard-stats";
import { ProductManagement } from "@/components/ProductManagement";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cancelingSale, setCancelingSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto removido",
        description: "O item foi excluído do catálogo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const cancelSaleMutation = useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/sales/${saleId}/cancel`, { reason });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Erro ao cancelar venda");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Venda cancelada",
        description: "A venda foi cancelada e os produtos retornaram ao estoque.",
      });
      setCancelingSale(null);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar venda",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCancelSale = () => {
    if (cancelingSale && cancelReason.trim().length >= 5) {
      cancelSaleMutation.mutate({
        saleId: cancelingSale.id,
        reason: cancelReason,
      });
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Acesso restrito aos administradores.
      </div>
    );
  }

  return (
    <>
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Painel Administrativo</h1>
          <p className="text-sm text-gray-600">
            Acompanhe o desempenho e gerencie produtos, usuários e vendas.
          </p>
        </div>
        <Link href="/seller">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Realizar Venda
          </Button>
        </Link>
      </header>

      <StockAlert />
      <DashboardStats />

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Gerenciamento de Produtos</h2>
            <ProductManagement />
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Inventário Atual</h2>
              <p className="text-sm text-muted-foreground">
                Visão consolidada do estoque disponível.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <ScrollArea className="h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>R$ {Number(product.price).toFixed(2)}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProduct.mutate(product.id)}
                            disabled={deleteProduct.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Gerenciamento de Vendas</h2>
              <p className="text-sm text-muted-foreground">
                Visualize e gerencie todas as vendas realizadas.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales?.map((sale: any) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">#{sale.id}</TableCell>
                        <TableCell>
                          {new Date(sale.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>{sale.seller?.username || "N/A"}</TableCell>
                        <TableCell>R$ {Number(sale.totalAmount).toFixed(2)}</TableCell>
                        <TableCell>
                          <span className="uppercase text-sm">{sale.paymentMethod}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sale.status === "active" ? "default" : "secondary"}>
                            {sale.status === "active" ? "Ativa" : "Cancelada"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setCancelingSale(sale)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!sales || sales.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          Nenhuma venda registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>

    {/* Dialog de Cancelamento */}
    <Dialog open={!!cancelingSale} onOpenChange={(open) => !open && setCancelingSale(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Venda</DialogTitle>
          <DialogDescription>
            Venda #{cancelingSale?.id} - Total: R$ {Number(cancelingSale?.totalAmount || 0).toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Motivo do Cancelamento <span className="text-destructive">*</span>
            </label>
            <Textarea
              placeholder="Descreva o motivo do cancelamento (mínimo 5 caracteres)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Os produtos serão devolvidos ao estoque automaticamente.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelingSale(null)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelSale}
            disabled={cancelSaleMutation.isPending || cancelReason.trim().length < 5}
          >
            {cancelSaleMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
