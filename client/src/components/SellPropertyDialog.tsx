import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DollarSign, Key } from "lucide-react";

import { RouterOutput } from "@/lib/trpc";

type Property = RouterOutput["properties"]["listAll"]["items"][0];

interface SellPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  transactionAmount: string;
  setTransactionAmount: (value: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  formatPrice: (price: number) => string;
}

export function SellPropertyDialog({
  open,
  onOpenChange,
  property,
  transactionAmount,
  setTransactionAmount,
  onConfirm,
  isPending,
  formatPrice
}: SellPropertyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {property?.transactionType === "venda" ? <DollarSign className="h-5 w-5 text-green-600" /> : <Key className="h-5 w-5 text-blue-600" />}
            {property?.transactionType === "venda" ? "Registrar Venda" : "Registrar Aluguel"}
          </DialogTitle>
          <DialogDescription>
            {property?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Preço Anunciado</p>
            <p className="text-xl font-bold">{property && formatPrice(property.price)}</p>
          </div>
          
          <div className="space-y-2">
            <Label>Valor da Transação (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={transactionAmount}
              onChange={(e) => setTransactionAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500">
              O valor final da venda ou o valor do aluguel mensal.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800">
              Ao confirmar, o status do imóvel será alterado para <strong>{property?.transactionType === "venda" ? "Vendido" : "Alugado"}</strong> e uma comissão será gerada.
            </p>
          </div>

          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Processando..." : `Confirmar ${property?.transactionType === "venda" ? "Venda" : "Aluguel"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
