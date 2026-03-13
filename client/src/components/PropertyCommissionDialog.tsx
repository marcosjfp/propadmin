import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { RouterOutput } from "@/lib/trpc";

type Property = RouterOutput["properties"]["listAll"]["items"][0];

interface PropertyCommissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProperty: Property | null;
  customCommissionRate: string;
  setCustomCommissionRate: (value: string) => void;
  onSave: () => void;
  isPending: boolean;
}

export function PropertyCommissionDialog({
  open,
  onOpenChange,
  selectedProperty,
  customCommissionRate,
  setCustomCommissionRate,
  onSave,
  isPending
}: PropertyCommissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Taxa de Comissão Customizada</DialogTitle>
          <DialogDescription>
            Defina uma taxa de comissão específica para "{selectedProperty?.title}".
            Deixe em branco para usar a taxa padrão do sistema (6%).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Taxa (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={customCommissionRate}
              onChange={(e) => setCustomCommissionRate(e.target.value)}
              placeholder="Ex: 5"
            />
            <p className="text-sm text-gray-500">
              Valor atual: {selectedProperty?.customCommissionRate ? `${selectedProperty.customCommissionRate / 100}%` : 'Padrão (6%)'}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
