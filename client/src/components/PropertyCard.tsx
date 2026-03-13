import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, DollarSign, UserPlus, Image as ImageIcon, CheckCircle, XCircle, Percent } from "lucide-react";
import { RouterOutput } from "@/lib/trpc";

type Property = RouterOutput["properties"]["listAll"]["items"][0];

interface PropertyCardProps {
  property: Property;
  isAdmin: boolean;
  currentUserId?: number;
  onEdit: (property: Property) => void;
  onDelete: (id: number) => void;
  onSell: (property: Property) => void;
  onAssign: (property: Property) => void;
  onImage: (id: number) => void;
  onCommission: (property: Property) => void;
  onApprove: (id: number) => void;
  onReject: (property: Property) => void;
  isDeleting: boolean;
  isApproving: boolean;
}

export function PropertyCard({
  property,
  isAdmin,
  currentUserId,
  onEdit,
  onDelete,
  onSell,
  onAssign,
  onImage,
  onCommission,
  onApprove,
  onReject,
  isDeleting,
  isApproving
}: PropertyCardProps) {
  const isOwner = currentUserId === property.agentId;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  return (
    <Card 
      className={`overflow-hidden flex flex-col ${
        property.status === 'vendida' ? 'opacity-75 bg-green-50' : 
        property.status === 'alugada' ? 'opacity-75 bg-blue-50' :
        property.status === 'inativa' ? 'opacity-75 bg-gray-50' :
        !property.isApproved ? 'border-yellow-400 bg-yellow-50/30' : ''
      }`}
    >
      {/* Container de imagem reservado por enquanto (será implementado posteriormente) */}
      <div className="h-48 bg-gray-200 relative">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 flex-col">
          <ImageIcon className="h-12 w-12 mb-2" />
          <span>Sem imagem</span>
        </div>
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex gap-2 flex-col">
          <Badge className={`
            ${property.status === 'ativa' && property.isApproved ? 'bg-green-500 hover:bg-green-600' : ''}
            ${property.status === 'vendida' ? 'bg-indigo-500 hover:bg-indigo-600' : ''}
            ${property.status === 'alugada' ? 'bg-blue-500 hover:bg-blue-600' : ''}
            ${property.status === 'inativa' ? 'bg-gray-500 hover:bg-gray-600' : ''}
            ${property.status === 'pendente' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
          `}>
            {property.status.toUpperCase()}
          </Badge>

          {!property.isApproved && property.status !== 'pendente' && (
            <Badge variant="outline" className="bg-white text-yellow-600 border-yellow-500">
              PENDENTE APROVAÇÃO
            </Badge>
          )}

          {property.status === 'pendente' && property.rejectionReason && (
            <Badge variant="destructive" className="mt-1" title={property.rejectionReason}>
              REJEITADO - VER DETALHES
            </Badge>
          )}

          <Badge variant="secondary" className="capitalize mt-1">
            {property.type}
          </Badge>
        </div>

        {/* Action Buttons Top Right */}
        {(isAdmin || isOwner) && (
          <div className="absolute top-2 right-2 flex gap-1 bg-white/80 p-1 rounded-lg backdrop-blur-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
              onClick={() => onEdit(property)}
              title="Editar imóvel"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
              onClick={() => onImage(property.id)}
              title="Gerenciar imagens"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                onClick={() => onCommission(property)}
                title="Taxa de comissão customizada"
              >
                <Percent className="h-4 w-4" />
              </Button>
            )}

            {property.status === 'ativa' && property.isApproved && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                onClick={() => onSell(property)}
                title={`Registrar ${property.transactionType === 'venda' ? 'venda' : 'aluguel'}`}
              >
                <DollarSign className="h-4 w-4" />
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                onClick={() => onAssign(property)}
                title="Atribuir a corretor parceiro"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
              disabled={isDeleting}
              onClick={() => onDelete(property.id)}
              title="Excluir imóvel"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-2" title={property.title}>
            {property.title}
          </CardTitle>
          <span className="font-bold text-lg text-blue-600 whitespace-nowrap">
            {formatPrice(property.price)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col justify-between pt-0 pb-4">
        {/* Admin/Owner Badge Row */}
        {(isAdmin || isOwner) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {property.customCommissionRate && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-0">
                Taxa Especial: {property.customCommissionRate / 100}%
              </Badge>
            )}
            {property.assignedAgentId && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs py-0">
                Parceria Ativa
              </Badge>
            )}
          </div>
        )}

        <div className="text-sm text-gray-500 mb-4 flex-grow line-clamp-3">
          {property.description}
        </div>

        {/* Pending Approval Admin Actions */}
        {!property.isApproved && isAdmin && property.status === 'pendente' && (
          <div className="mt-4 pt-4 border-t flex flex-col gap-2">
            <p className="text-sm font-medium text-yellow-700">Ação Necessária (Admin)</p>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onApprove(property.id)}
                disabled={isApproving}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => onReject(property)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          </div>
        )}

        {/* Pending Approval Agent Message */}
        {!property.isApproved && property.status === 'pendente' && !isAdmin && (
          <div className="mt-4 pt-4 border-t">
            {property.rejectionReason ? (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-100">
                <p className="font-semibold flex items-center gap-1 mb-1">
                  <XCircle className="h-4 w-4" /> Anúncio Rejeitado
                </p>
                <p>Motivo: {property.rejectionReason}</p>
                <p className="mt-2 text-xs">Por favor, edite o imóvel corrigindo o problema para solicitar nova avaliação.</p>
              </div>
            ) : (
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-md text-sm text-center border border-yellow-100">
                Aguardando aprovação do administrador
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
