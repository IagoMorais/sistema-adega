import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function StockAlert() {
  const { data: lowStockProducts } = useQuery<Product[]>({
    queryKey: ["/api/low-stock"],
  });

  if (!lowStockProducts?.length) return null;

  return (
    <div className="space-y-2">
      {lowStockProducts.map((product) => (
        <Alert key={product.id} className="border-orange-200 bg-orange-50 text-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Alerta de Estoque Baixo</AlertTitle>
          <AlertDescription className="text-orange-700">
            {product.name} está com estoque baixo! Estoque atual: {product.quantity}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
