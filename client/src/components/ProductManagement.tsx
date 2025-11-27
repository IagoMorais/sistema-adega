import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductForm } from "./product-form";
import { ProductAddItemsForm } from "./ProductAddItemsForm";
import { useAuth } from "@/hooks/use-auth";

export function ProductManagement() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gerenciamento de Produtos</h1>
      
      <Tabs defaultValue="create" className="w-full">
        <TabsList>
          <TabsTrigger value="create">Criar Novo Produto</TabsTrigger>
          <TabsTrigger value="add">Adicionar Itens</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <ProductForm />
        </TabsContent>
        
        <TabsContent value="add">
          <ProductAddItemsForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}