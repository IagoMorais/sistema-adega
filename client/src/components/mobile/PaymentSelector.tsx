import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { paymentMethods } from "@shared/schema";
import { cn } from "@/lib/utils";

export interface Payment {
  paymentMethod: string;
  amount: number;
}

interface PaymentSelectorProps {
  totalAmount: number;
  onPaymentsChange: (payments: Payment[]) => void;
  onModeChange: (mode: "single" | "split") => void;
}

export function PaymentSelector({
  totalAmount,
  onPaymentsChange,
  onModeChange,
}: PaymentSelectorProps) {
  const [mode, setMode] = useState<"single" | "split">("single");
  const [singleMethod, setSingleMethod] = useState<string>("cash");
  const [splitPayments, setSplitPayments] = useState<Payment[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("cash");
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("");

  // Carregar último método de pagamento do localStorage quando o componente for montado
  useEffect(() => {
    const savedMethod = localStorage.getItem("lastPaymentMethod");
    if (savedMethod) {
      setSingleMethod(savedMethod);
      setNewPaymentMethod(savedMethod);
    }
  }, []);

  const handleModeChange = (newMode: "single" | "split") => {
    setMode(newMode);
    onModeChange(newMode);
    
    if (newMode === "single") {
      onPaymentsChange([{ paymentMethod: singleMethod, amount: totalAmount }]);
      setSplitPayments([]);
    } else {
      onPaymentsChange([]);
    }
  };

  const handleSingleMethodChange = (method: string) => {
    setSingleMethod(method);
    onPaymentsChange([{ paymentMethod: method, amount: totalAmount }]);
    // Salvar último método usado
    localStorage.setItem("lastPaymentMethod", method);
  };

  const addSplitPayment = () => {
    const amount = parseFloat(newPaymentAmount.replace(",", "."));
    
    if (!amount || amount <= 0) {
      return;
    }

    const remaining = getRemainingAmount();
    if (amount > remaining + 0.01) {
      return;
    }

    const newPayment: Payment = {
      paymentMethod: newPaymentMethod,
      amount: amount,
    };

    const updatedPayments = [...splitPayments, newPayment];
    setSplitPayments(updatedPayments);
    onPaymentsChange(updatedPayments);
    
    // Salvar último método usado e manter o mesmo para próxima entrada
    localStorage.setItem("lastPaymentMethod", newPaymentMethod);
    
    setNewPaymentAmount("");
    // Mantém o método atual ao invés de resetar
  };

  const removeSplitPayment = (index: number) => {
    const updatedPayments = splitPayments.filter((_, i) => i !== index);
    setSplitPayments(updatedPayments);
    onPaymentsChange(updatedPayments);
  };

  const getTotalPaid = () => {
    return splitPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  const getRemainingAmount = () => {
    return totalAmount - getTotalPaid();
  };

  const isComplete = () => {
    if (mode === "single") return true;
    return Math.abs(getRemainingAmount()) < 0.01 && splitPayments.length >= 2;
  };

  return (
    <div className="space-y-4">
      <RadioGroup value={mode} onValueChange={handleModeChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="single" id="single" />
          <Label htmlFor="single">Pagamento Único</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="split" id="split" />
          <Label htmlFor="split">Pagamento Dividido</Label>
        </div>
      </RadioGroup>

      {mode === "single" ? (
        <div className="space-y-2">
          <Label>Forma de Pagamento</Label>
          <Select value={singleMethod} onValueChange={handleSingleMethodChange}>
            <SelectTrigger>
              <SelectValue />
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
      ) : (
        <div className="space-y-4">
          {/* Lista de pagamentos adicionados */}
          {splitPayments.length > 0 && (
            <div className="space-y-2">
              <Label>Pagamentos Adicionados</Label>
              <div className="space-y-2">
                {splitPayments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium uppercase text-sm">
                        {payment.paymentMethod}
                      </div>
                      <div className="text-lg font-bold">
                        R$ {payment.amount.toFixed(2)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSplitPayment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adicionar novo pagamento */}
          {getRemainingAmount() > 0.01 && (
            <div className="space-y-3 p-4 rounded-lg border bg-background">
              <Label>Adicionar Pagamento</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={newPaymentMethod}
                  onValueChange={setNewPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  placeholder="Valor"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSplitPayment();
                    }
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={addSplitPayment}
                  disabled={!newPaymentAmount || parseFloat(newPaymentAmount.replace(",", ".")) <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
                
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const remaining = getRemainingAmount();
                    if (remaining > 0) {
                      setNewPaymentAmount(remaining.toFixed(2));
                    }
                  }}
                  disabled={getRemainingAmount() <= 0}
                >
                  Preencher Restante
                </Button>
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="space-y-2 p-4 rounded-lg border bg-muted/30">
            <div className="flex justify-between text-sm">
              <span>Total da Venda:</span>
              <span className="font-bold">R$ {totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Pago:</span>
              <span className="font-bold">R$ {getTotalPaid().toFixed(2)}</span>
            </div>
            <div
              className={cn(
                "flex justify-between text-sm font-bold",
                getRemainingAmount() < -0.01 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <span>Restante:</span>
              <span>R$ {getRemainingAmount().toFixed(2)}</span>
            </div>

            {isComplete() && (
              <div className="pt-2 mt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                  <span className="font-medium">Pagamento completo</span>
                </div>
              </div>
            )}

            {splitPayments.length > 0 && splitPayments.length < 2 && (
              <div className="pt-2 mt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Adicione pelo menos 2 formas de pagamento
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
