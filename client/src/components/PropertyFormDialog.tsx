import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface PropertyFormData {
  title: string;
  description: string;
  type: string;
  transactionType: string;
  price: string;
  size: string;
  rooms: string;
  bathrooms: string;
  hasBackyard: boolean;
  hasLivingRoom: boolean;
  hasKitchen: boolean;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: "pendente" | "ativa" | "vendida" | "alugada" | "inativa" | "rejeitada";
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  formData: PropertyFormData;
  setFormData: React.Dispatch<React.SetStateAction<PropertyFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  isAdmin: boolean;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  editingId,
  formData,
  setFormData,
  onSubmit,
  isPending,
  isAdmin,
}: PropertyFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? "Editar Imóvel" : "Cadastrar Imóvel"}</DialogTitle>
          <DialogDescription>
            {editingId 
              ? "Modifique os detalhes do imóvel abaixo." 
              : "Preencha os dados do novo imóvel para cadastro."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Anúncio</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Negócio</Label>
              <Select
                value={formData.transactionType}
                onValueChange={(value) => setFormData({ ...formData, transactionType: value as "venda" | "aluguel" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="aluguel">Aluguel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Imóvel</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="terreno">Terreno</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">
                Valor ({formData.transactionType === 'venda' ? 'Venda' : 'Aluguel'})
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Área (m²)</Label>
              <Input
                id="size"
                type="number"
                min="1"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rooms">Quartos</Label>
              <Input
                id="rooms"
                type="number"
                min="0"
                value={formData.rooms}
                onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Banheiros</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                required
              />
            </div>

            {editingId && isAdmin && (
              <div className="space-y-2">
                <Label>Status do Imóvel</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "ativa" | "vendida" | "alugada" | "inativa") => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa (Visível)</SelectItem>
                    <SelectItem value="vendida">Vendida</SelectItem>
                    <SelectItem value="alugada">Alugada</SelectItem>
                    <SelectItem value="inativa">Inativa (Oculta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-4 md:col-span-2 p-4 bg-gray-50 rounded-lg">
              <p className="font-medium mb-2">Comodidades</p>
              <div className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasBackyard"
                    checked={formData.hasBackyard}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasBackyard: checked as boolean })}
                  />
                  <Label htmlFor="hasBackyard">Quintal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasLivingRoom"
                    checked={formData.hasLivingRoom}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasLivingRoom: checked as boolean })}
                  />
                  <Label htmlFor="hasLivingRoom">Sala</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasKitchen"
                    checked={formData.hasKitchen}
                    onCheckedChange={(checked) => setFormData({ ...formData, hasKitchen: checked as boolean })}
                  />
                  <Label htmlFor="hasKitchen">Cozinha</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2 mt-4 border-t pt-4">
              <h3 className="font-medium">Endereço</h3>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                placeholder="Rua, número, bairro..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado (UF)</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                maxLength={2}
                placeholder="SP"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="00000-000"
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white" 
            disabled={isPending}
          >
            {isPending ? "Salvando..." : editingId ? "Atualizar Imóvel" : "Cadastrar Imóvel"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
