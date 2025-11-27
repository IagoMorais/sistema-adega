
import { db } from "../server/db";
import { users, products, sales, saleItems } from "../shared/schema";

async function verifyDatabase() {
  console.log("Verificando banco de dados...");

  try {
    const allUsers = await db.select().from(users);
    console.log("Usuários encontrados:", allUsers.length);

    const allProducts = await db.select().from(products);
    console.log("Produtos encontrados:", allProducts.length);

    const allSales = await db.select().from(sales);
    console.log("Vendas encontradas:", allSales.length);

    const allSaleItems = await db.select().from(saleItems);
    console.log("Itens de venda encontrados:", allSaleItems.length);

    console.log("✅ Banco de dados verificado com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ Erro ao verificar banco de dados:", error);
    return false;
  }
}

verifyDatabase().catch(console.error);
