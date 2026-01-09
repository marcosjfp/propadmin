import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { systemToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { 
  ArrowLeft, 
  MapPin, 
  Bed, 
  Bath, 
  Ruler, 
  Trees,
  UtensilsCrossed,
  Sofa,
  Phone,
  Mail,
  User,
  Calendar,
  Share2,
  DollarSign
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PropertyImageGallery } from "@/components/ImageUpload";

export default function PropertyDetails() {
  const params = useParams();
  const { user } = useAuth();
  const propertyId = parseInt(params.id || "0");
  
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState("");

  const propertyQuery = trpc.properties.getById.useQuery({ id: propertyId });
  const agentsQuery = trpc.users.listAgents.useQuery();
  const createCommissionMutation = trpc.commissions.create.useMutation();
  const updatePropertyMutation = trpc.properties.update.useMutation();

  const property = propertyQuery.data;
  const agent = agentsQuery.data?.find(a => a.id === property?.agentId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.title,
        text: `Confira este imóvel: ${property?.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      systemToast.info("Link copiado para a área de transferência!");
    }
  };

  const handleSellOrRent = () => {
    if (!property) return;
    setTransactionAmount((property.price / 100).toString());
    setSellDialogOpen(true);
  };

  // Obter taxa de comissão (customizada ou padrão)
  const getCommissionRate = (): number => {
    if (property?.customCommissionRate !== null && property?.customCommissionRate !== undefined) {
      return property.customCommissionRate;
    }
    return property?.transactionType === "venda" ? 800 : 1000;
  };

  const handleConfirmTransaction = async () => {
    if (!property) return;

    const amount = Math.round(parseFloat(transactionAmount) * 100);
    if (isNaN(amount) || amount <= 0) {
      systemToast.warning("Por favor, informe um valor válido");
      return;
    }

    const newStatus = property.transactionType === "venda" ? "vendida" : "alugada";

    try {
      const result = await createCommissionMutation.mutateAsync({
        propertyId: property.id,
        transactionType: property.transactionType,
        transactionAmount: amount,
      });

      await updatePropertyMutation.mutateAsync({
        id: property.id,
        status: newStatus,
      });

      // Mostrar toast com valores atualizados do backend
      systemToast.transaction({
        propertyTitle: property.title,
        transactionType: property.transactionType,
        transactionAmount: result.transactionAmount,
        commissionRate: result.commissionRate,
        commissionAmount: result.commissionAmount,
      });
      
      setSellDialogOpen(false);
      propertyQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao registrar transação");
    }
  };

  if (propertyQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando imóvel...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Imóvel não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">O imóvel que você procura não existe ou foi removido.</p>
            <Link href="/propriedades">
              <Button className="w-full">Ver Imóveis Disponíveis</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-green-100 text-green-800">Disponível</Badge>;
      case "vendida":
        return <Badge className="bg-blue-100 text-blue-800">Vendido</Badge>;
      case "alugada":
        return <Badge className="bg-purple-100 text-purple-800">Alugado</Badge>;
      case "inativa":
        return <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      apartamento: "Apartamento",
      casa: "Casa",
      terreno: "Terreno",
      comercial: "Comercial",
      outro: "Outro",
    };
    return types[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/propriedades">
                <Button variant="ghost" size="sm" className="h-8 px-2" aria-label="Voltar para lista de propriedades">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{property.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare} 
                className="flex-1 sm:flex-none h-8"
                aria-label="Compartilhar imóvel"
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Compartilhar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <PropertyImageGallery propertyId={propertyId} />

            {/* Details */}
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl">{property.title}</CardTitle>
                    <CardDescription className="flex items-start sm:items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                      <span className="text-sm">
                        {property.address}, {property.city} - {property.state}
                        {property.zipCode && ` | CEP: ${property.zipCode}`}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
                    {getStatusBadge(property.status)}
                    <Badge variant="outline">{getTypeBadge(property.type)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Price */}
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-600 mb-1">
                    {property.transactionType === "venda" ? "Valor de Venda" : "Valor do Aluguel"}
                  </p>
                  <p className="text-2xl sm:text-4xl font-bold text-blue-700">
                    {formatPrice(property.price)}
                    {property.transactionType === "aluguel" && (
                      <span className="text-sm sm:text-lg font-normal">/mês</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs sm:text-sm text-blue-600">
                      Comissão: {getCommissionRate() / 100}%
                    </p>
                    {property.customCommissionRate !== null && property.customCommissionRate !== undefined && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                        Customizada
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <Ruler className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">Área</p>
                      <p className="font-semibold text-sm sm:text-base">{property.size} m²</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <Bed className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">Quartos</p>
                      <p className="font-semibold text-sm sm:text-base">{property.rooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <Bath className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">Banheiros</p>
                      <p className="font-semibold text-sm sm:text-base">{property.bathrooms}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-gray-500">Cadastrado</p>
                      <p className="font-semibold text-xs sm:text-sm truncate">{formatDate(property.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Comodidades</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.hasLivingRoom && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm">
                        <Sofa className="h-3 w-3 sm:h-4 sm:w-4" />
                        Sala
                      </div>
                    )}
                    {property.hasKitchen && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm">
                        <UtensilsCrossed className="h-3 w-3 sm:h-4 sm:w-4" />
                        Cozinha
                      </div>
                    )}
                    {property.hasBackyard && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm">
                        <Trees className="h-3 w-3 sm:h-4 sm:w-4" />
                        Quintal
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {property.description && (
                  <div>
                    <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">Descrição</h3>
                    <p className="text-gray-600 whitespace-pre-wrap text-sm">{property.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Corretor Responsável</CardTitle>
              </CardHeader>
              <CardContent>
                {agent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{agent.name || "Corretor"}</p>
                        {agent.creci && (
                          <p className="text-sm text-gray-500">CRECI: {agent.creci}</p>
                        )}
                      </div>
                    </div>
                    
                    {agent.email && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{agent.email}</span>
                      </div>
                    )}
                    
                    {agent.phone && (
                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm">{agent.phone}</span>
                      </div>
                    )}

                    {property.status === "ativa" && (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => setContactDialogOpen(true)}
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        Entrar em Contato
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Informações do corretor não disponíveis</p>
                )}
              </CardContent>
            </Card>

            {/* Action Card for Agent */}
            {(user?.role === "agent" || user?.role === "admin") && property.status === "ativa" && (user?.id === property.agentId || user?.id === property.assignedAgentId) && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-800">Ações do Corretor</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleSellOrRent}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Registrar {property.transactionType === "venda" ? "Venda" : "Aluguel"}
                  </Button>
                  <p className="text-xs text-green-700 mt-2 text-center">
                    Comissão: {getCommissionRate() / 100}%
                    {property.customCommissionRate !== null && property.customCommissionRate !== undefined && (
                      <span className="ml-1 text-orange-600">(customizada)</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Assigned Agent Card - Show if property is assigned to a different agent */}
            {property.assignedAgentId && property.assignedAgentId !== property.agentId && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800">Corretor Atribuído</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-800">
                        {property.assignedAgentName || `Corretor #${property.assignedAgentId}`}
                      </p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        Responsável pela venda
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Calculator */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Simulador de Comissão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Valor do Imóvel</p>
                    <p className="text-xl font-bold">{formatPrice(property.price)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-blue-600">Taxa de Comissão</p>
                      {property.customCommissionRate !== null && property.customCommissionRate !== undefined && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                          Customizada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xl font-bold text-blue-700">
                      {getCommissionRate() / 100}%
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Comissão Estimada</p>
                    <p className="text-2xl font-bold text-green-700">
                      {formatPrice(property.price * (getCommissionRate() / 10000))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contatar Corretor</DialogTitle>
            <DialogDescription>
              Entre em contato sobre o imóvel: {property.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {agent && (
              <>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-lg">{agent.name}</p>
                  {agent.creci && <p className="text-sm text-gray-500">CRECI: {agent.creci}</p>}
                </div>
                
                {agent.email && (
                  <a 
                    href={`mailto:${agent.email}?subject=Interesse no imóvel: ${property.title}`}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-gray-500">{agent.email}</p>
                    </div>
                  </a>
                )}
                
                {agent.phone && (
                  <a 
                    href={`tel:${agent.phone}`}
                    className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Telefone</p>
                      <p className="text-sm text-gray-500">{agent.phone}</p>
                    </div>
                  </a>
                )}

                {agent.phone && (
                  <a 
                    href={`https://wa.me/55${agent.phone.replace(/\D/g, '')}?text=Olá! Tenho interesse no imóvel: ${property.title}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border border-green-200 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <span className="text-2xl">📱</span>
                    <div>
                      <p className="font-medium text-green-800">WhatsApp</p>
                      <p className="text-sm text-green-600">Enviar mensagem</p>
                    </div>
                  </a>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell/Rent Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {property.transactionType === "venda" ? "Registrar Venda" : "Registrar Aluguel"}
            </DialogTitle>
            <DialogDescription>{property.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Preço Anunciado</p>
              <p className="text-xl font-bold">{formatPrice(property.price)}</p>
            </div>
            
            <div>
              <Label>Valor da Transação (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-600">Taxa de Comissão</p>
                {property.customCommissionRate !== null && property.customCommissionRate !== undefined && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs">
                    Customizada
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold text-blue-700 mb-2">
                {getCommissionRate() / 100}%
              </p>
              <p className="text-sm text-blue-600">Comissão Estimada</p>
              <p className="text-xl font-bold text-blue-700">
                {transactionAmount && !isNaN(parseFloat(transactionAmount))
                  ? formatPrice(
                      Math.round(
                        parseFloat(transactionAmount) * 100 *
                        (getCommissionRate() / 10000)
                      )
                    )
                  : "R$ 0,00"}
              </p>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleConfirmTransaction}
              disabled={createCommissionMutation.isPending || updatePropertyMutation.isPending}
            >
              {createCommissionMutation.isPending || updatePropertyMutation.isPending
                ? "Processando..."
                : `Confirmar ${property.transactionType === "venda" ? "Venda" : "Aluguel"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
