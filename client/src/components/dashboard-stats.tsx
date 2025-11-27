import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Product } from "@shared/schema";
import type { Stats } from "@/lib/types";
import { DollarSign, ShoppingCart, Package } from "lucide-react";

export function DashboardStats() {
  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  if (!stats || !products) return null;

  const topProductNames = stats.topProducts.map((p) => {
    const product = products.find((prod) => prod.id === p.productId);
    return `${product?.name} (${p.quantity} unidades)`;
  });

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSales}</div>
        </CardContent>
      </Card>

      <Card className="bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receita</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R${stats.totalRevenue.toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Produtos em Estoque</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{products.length}</div>
        </CardContent>
      </Card>

      <Card className="sm:col-span-2 lg:col-span-3 bg-white/50 backdrop-blur supports-[backdrop-filter]:bg-white/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-6 space-y-1">
            {topProductNames.map((name, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}