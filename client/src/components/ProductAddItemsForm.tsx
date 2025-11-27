import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Product } from "@shared/schema";

interface AddItemsFormValues {
  productId: number | null;
  quantity: number;
}

export function ProductAddItemsForm() {
  const { toast } = useToast();
  const { user } = useAuth();

  // Buscar lista de produtos existentes
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/products");
      return res.json();
    },
  });

  const form = useForm<AddItemsFormValues>({
    defaultValues: {
      productId: null,
      quantity: 0,
    },
  });

  const addItems = useMutation({
    mutationFn: async (data: AddItemsFormValues) => {
      if (!data.productId) {
        throw new Error("Selecione um produto.");
      }

      const selectedProduct: Product | undefined = products?.find(
        (product: Product) => product.id === data.productId,
      );

      if (!selectedProduct) {
        throw new Error("Produto selecionado não encontrado.");
      }

      const increment = Number.isFinite(data.quantity) ? data.quantity : 0;
      if (increment <= 0) {
        throw new Error("Quantidade deve ser maior que zero.");
      }

      const res = await apiRequest("PATCH", `/api/products/${data.productId}`, {
        quantity: selectedProduct.quantity + increment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      form.reset({
        productId: null,
        quantity: 0,
      });
      toast({
        title: "Sucesso",
        description: "Itens adicionados com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => addItems.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produto</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value != null ? String(field.value) : undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products?.map((product: Product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantidade</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? 0 : parseInt(value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={addItems.isPending}>
          Adicionar Itens
        </Button>
      </form>
    </Form>
  );
}
