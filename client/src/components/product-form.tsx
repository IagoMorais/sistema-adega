import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export function ProductForm() {
  const { toast } = useToast();
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return null;
  }
  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: "",
      brand: "",
      price: 0,
      quantity: 0,
      minStockLevel: 0,
    },
  });

  const createProduct = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const payload: InsertProduct = {
        ...data,
        name: data.name.trim(),
        brand: data.brand.trim(),
        price: Number(data.price),
        quantity: Math.max(0, Math.trunc(Number(data.quantity))),
        minStockLevel: Math.max(0, Math.trunc(Number(data.minStockLevel))),
        discount: Number.isFinite(Number(data.discount)) ? Number(data.discount) : 0,
      };

      const res = await apiRequest("POST", "/api/products", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      form.reset();
      toast({
        title: "Sucesso",
        description: "Produto criado com sucesso",
      });
    },
    onError: (error: Error) => {
      const [, ...rest] = error.message.split(": ");
      const description = rest.join(": ") || "Não foi possível criar o produto";
      toast({
        title: "Erro",
        description,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createProduct.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Nome do produto"
                  onBlur={() => field.onChange(field.value.trim())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Marca do produto"
                  onBlur={() => field.onChange(field.value.trim())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0"
                  {...field}
                  onChange={(e) => {
                    const raw = e.target.value.replace(",", ".");
                    if (raw === "") {
                      field.onChange(0);
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    field.onChange(Math.max(0, parsed));
                  }}
                />
              </FormControl>
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
                    const raw = e.target.value.replace(",", ".");
                    if (raw === "") {
                      field.onChange(0);
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    field.onChange(Math.max(0, Math.trunc(parsed)));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="minStockLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nível Mínimo de Estoque</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  {...field}
                  onChange={(e) => {
                    const raw = e.target.value.replace(",", ".");
                    if (raw === "") {
                      field.onChange(0);
                      return;
                    }
                    const parsed = Number(raw);
                    if (Number.isNaN(parsed)) {
                      return;
                    }
                    field.onChange(Math.max(0, Math.trunc(parsed)));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createProduct.isPending}>
          Adicionar Produto
        </Button>
      </form>
    </Form>
  );
}
