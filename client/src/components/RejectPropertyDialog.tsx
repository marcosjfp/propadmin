import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { XCircle } from "lucide-react";

import { RouterOutput } from "@/lib/trpc";

type Property = RouterOutput["properties"]["listAll"]["items"][0];

interface RejectPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  onReject: (reason: string) => void;
  isPending: boolean;
}

export function RejectPropertyDialog({
  open,
  onOpenChange,
  property,
  onReject,
  isPending
}: RejectPropertyDialogProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onReject(reason);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Rejeitar Imóvel
          </DialogTitle>
          <DialogDescription>
            Informe o motivo da rejeição para o imóvel: <strong>{property?.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Rejeição</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Fotos de baixa qualidade, informações incompletas, endereço incorreto..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
              disabled={isPending || !reason.trim()}
            >
              {isPending ? "Processando..." : "Confirmar Rejeição"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
