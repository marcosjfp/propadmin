import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";

import { RouterOutput } from "@/lib/trpc";

type Property = RouterOutput["properties"]["listAll"]["items"][0];
type User = RouterOutput["users"]["list"]["items"][0];

interface AssignAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  agents: User[];
  selectedAgentId: string;
  onAgentChange: (id: string) => void;
  onAssign: () => void;
  isPending: boolean;
}

export function AssignAgentDialog({
  open,
  onOpenChange,
  property,
  agents,
  selectedAgentId,
  onAgentChange,
  onAssign,
  isPending
}: AssignAgentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Atribuir Corretor ao Imóvel
          </DialogTitle>
          <DialogDescription>
            {property?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <p className="text-gray-600">Imóvel Selecionado</p>
            <p className="font-semibold">{property?.title}</p>
            <p className="text-gray-500">{property?.address}, {property?.city}</p>
          </div>
          
          <div className="space-y-2">
            <Label>Corretor Responsável</Label>
            <Select 
              value={selectedAgentId || "none"} 
              onValueChange={(value) => onAgentChange(value === "none" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um corretor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (remover atribuição)</SelectItem>
                {agents
                  ?.filter((agent: any) => agent.role === "agent" || agent.role === "admin")
                  .map((agent: any) => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name || agent.email || `Usuário #${agent.id}`}
                      {agent.creci && ` (CRECI: ${agent.creci})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              O corretor atribuído terá acesso exclusivo a este imóvel para gerenciar comissões.
            </p>
          </div>

          {property?.assignedAgentId && (
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                Este imóvel já está atribuído a um corretor. 
                {selectedAgentId === "" && " Ao confirmar sem selecionar um corretor, a atribuição será removida."}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={onAssign}
              disabled={isPending}
            >
              {isPending ? "Salvando..." : "Confirmar Atribuição"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
