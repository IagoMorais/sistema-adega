export type CartItem = {
  productId: number;
  quantity: number;
  name: string;
  price: string;
};

export type Stats = {
  totalSales: number;
  totalRevenue: number;
  topProducts: { productId: number; quantity: number }[];
};

export type TransactionInfo = {
  authorizationCode?: string;
  nsu?: string;
  terminal?: string;
  installments?: number;
};

export type SaleFormData = {
  productId: number;
  quantity: number;
  paymentMethod: "cash" | "credit" | "debit" | "pix";
  transactionInfo?: TransactionInfo;
};