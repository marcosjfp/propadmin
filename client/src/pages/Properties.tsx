import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { systemToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import ImageUpload from "@/components/ImageUpload";

import { Link, useLocation } from "wouter";
import { ArrowLeft, Plus, Trash2, Edit2, DollarSign, Search, X, Eye, Filter, ImageIcon, UserPlus, Percent, CheckCircle, XCircle, Clock } from "lucide-react";

export default function Properties() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [imagePropertyId, setImagePropertyId] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [customCommissionRate, setCustomCommissionRate] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    transactionType: "all",
    city: "",
    minPrice: "",
    maxPrice: "",
    minRooms: "",
    status: "all",
  });
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "apartamento",
    transactionType: "venda",
    price: "",
    size: "",
    rooms: "",
    bathrooms: "",
    hasBackyard: false,
    hasLivingRoom: true,
    hasKitchen: true,
    address: "",
    city: "",
    state: "",
    zipCode: "",
    status: "ativa" as "ativa" | "vendida" | "alugada" | "inativa",
  });

  // Redirecionar para login se não autenticado
  if (!authLoading && !user) {
    setLocation("/login");
    return null;
  }

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  // Queries devem ser chamadas incondicionalmente - usar enabled para controlar execução
  const isAgent = user?.role === "agent";
  const isAdmin = user?.role === "admin";
  
  const myPropertiesQuery = trpc.properties.myProperties.useQuery(undefined, {
    enabled: isAgent === true,
  });
  const allPropertiesQuery = trpc.properties.listAll.useQuery(undefined, {
    enabled: isAdmin === true,
  });
  
  // Selecionar a query correta baseada no role
  const propertiesQuery = isAgent ? myPropertiesQuery : allPropertiesQuery;
  
  const pendingQuery = trpc.properties.listPending.useQuery(undefined, {
    enabled: isAdmin === true,
  });
  const createMutation = trpc.properties.create.useMutation();
  const updateMutation = trpc.properties.update.useMutation();
  const deleteMutation = trpc.properties.delete.useMutation();
  const createCommissionMutation = trpc.commissions.create.useMutation();
  const assignAgentMutation = trpc.properties.assignAgent.useMutation();
  const setCustomCommissionMutation = trpc.properties.setCustomCommission.useMutation();
  const approveMutation = trpc.properties.approve.useMutation();
  const rejectMutation = trpc.properties.reject.useMutation();
  
  // Query para listar agentes (para admin atribuir)
  const agentsQuery = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      type: "apartamento",
      transactionType: "venda",
      price: "",
      size: "",
      rooms: "",
      bathrooms: "",
      hasBackyard: false,
      hasLivingRoom: true,
      hasKitchen: true,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      status: "ativa",
    });
    setEditingId(null);
  };

  const handleEdit = (property: any) => {
    setEditingId(property.id);
    setFormData({
      title: property.title,
      description: property.description || "",
      type: property.type,
      transactionType: property.transactionType,
      price: (property.price / 100).toString(),
      size: property.size.toString(),
      rooms: property.rooms.toString(),
      bathrooms: property.bathrooms.toString(),
      hasBackyard: property.hasBackyard,
      hasLivingRoom: property.hasLivingRoom,
      hasKitchen: property.hasKitchen,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode || "",
      status: property.status,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role !== "agent" && user?.role !== "admin") {
      alert("Apenas agentes podem criar/editar propriedades");
      return;
    }

    try {
      // Validar que todos os números são válidos
      const price = Math.round(parseFloat(formData.price) * 100);
      const size = parseInt(formData.size);
      const rooms = parseInt(formData.rooms);
      const bathrooms = parseInt(formData.bathrooms);

      if (isNaN(price) || isNaN(size) || isNaN(rooms) || isNaN(bathrooms)) {
        alert("Por favor, preencha todos os campos numéricos corretamente");
        return;
      }

      if (price <= 0) {
        alert("O preço deve ser maior que zero");
        return;
      }

      if (size <= 0) {
        alert("O tamanho deve ser maior que zero");
        return;
      }

      if (formData.state.length !== 2) {
        alert("O estado (UF) deve ter exatamente 2 caracteres (ex: SP, RJ, MG)");
        return;
      }

      const propertyData = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type as "apartamento" | "casa" | "terreno" | "comercial" | "outro",
        transactionType: formData.transactionType as "venda" | "aluguel",
        price,
        size,
        rooms,
        bathrooms,
        hasBackyard: formData.hasBackyard,
        hasLivingRoom: formData.hasLivingRoom,
        hasKitchen: formData.hasKitchen,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode || undefined,
      };

      console.log("Enviando dados:", propertyData);

      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...propertyData,
          status: formData.status,
        });
        systemToast.propertyUpdated(formData.title);
      } else {
        const result = await createMutation.mutateAsync(propertyData);
        systemToast.propertyCreated(formData.title);
        
        // Abrir automaticamente o dialog de imagens após criar o imóvel
        setImagePropertyId(result.id);
        setImageDialogOpen(true);
      }

      setOpen(false);
      resetForm();
      propertiesQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar/atualizar propriedade:", error);
      const errorMessage = error?.message || error?.data?.message || "Erro desconhecido";
      systemToast.error(errorMessage, {
        title: editingId ? "Falha ao atualizar" : "Falha ao criar"
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta propriedade?")) {
      try {
        const property = propertiesQuery.data?.find((p: any) => p.id === id);
        await deleteMutation.mutateAsync({ id });
        systemToast.deleted(property?.title || "Propriedade", "Imóvel");
        propertiesQuery.refetch();
      } catch (error: any) {
        systemToast.error(error?.message || "Falha ao deletar propriedade");
      }
    }
  };

  const handleSellOrRent = (property: any) => {
    setSelectedProperty(property);
    setTransactionAmount((property.price / 100).toString());
    // Definir taxa de comissão: customizada ou padrão
    const defaultRate = property.transactionType === "venda" ? 800 : 1000;
    const rate = property.customCommissionRate ?? defaultRate;
    setCustomCommissionRate((rate / 100).toString());
    setSellDialogOpen(true);
  };

  // Calcular comissão com base na taxa (customizada ou padrão)
  const getCommissionRate = (property: any): number => {
    if (property?.customCommissionRate !== null && property?.customCommissionRate !== undefined) {
      return property.customCommissionRate;
    }
    return property?.transactionType === "venda" ? 800 : 1000;
  };

  const handleConfirmTransaction = async () => {
    if (!selectedProperty) return;

    const amount = Math.round(parseFloat(transactionAmount) * 100);
    if (isNaN(amount) || amount <= 0) {
      systemToast.warning("Por favor, informe um valor válido");
      return;
    }

    const newStatus = selectedProperty.transactionType === "venda" ? "vendida" : "alugada";

    try {
      // Criar comissão (não passa commissionRate, deixa o backend decidir)
      const result = await createCommissionMutation.mutateAsync({
        propertyId: selectedProperty.id,
        transactionType: selectedProperty.transactionType,
        transactionAmount: amount,
      });

      // Atualizar status do imóvel
      await updateMutation.mutateAsync({
        id: selectedProperty.id,
        status: newStatus,
      });

      // Mostrar toast com valores atualizados
      systemToast.transaction({
        propertyTitle: selectedProperty.title,
        transactionType: selectedProperty.transactionType,
        transactionAmount: result.transactionAmount,
        commissionRate: result.commissionRate,
        commissionAmount: result.commissionAmount,
      });
      
      setSellDialogOpen(false);
      setSelectedProperty(null);
      setTransactionAmount("");
      propertiesQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao registrar transação:", error);
      systemToast.error(error?.message || "Erro ao registrar transação");
    }
  };

  // Handler para atribuir agente
  const handleAssignAgent = async () => {
    if (!selectedProperty) return;

    try {
      const result = await assignAgentMutation.mutateAsync({
        propertyId: selectedProperty.id,
        assignedAgentId: selectedAgentId ? parseInt(selectedAgentId) : null,
      });

      systemToast.propertyAssigned(selectedProperty.title, result.assignedAgentName);
      
      setAssignDialogOpen(false);
      setSelectedProperty(null);
      setSelectedAgentId("");
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao atribuir corretor");
    }
  };

  // Handler para definir comissão customizada
  const handleSetCustomCommission = async () => {
    if (!selectedProperty) return;

    const rate = customCommissionRate ? Math.round(parseFloat(customCommissionRate) * 100) : null;
    
    if (customCommissionRate && (isNaN(rate!) || rate! < 0 || rate! > 10000)) {
      systemToast.warning("Taxa de comissão deve estar entre 0% e 100%");
      return;
    }

    try {
      await setCustomCommissionMutation.mutateAsync({
        propertyId: selectedProperty.id,
        customCommissionRate: rate,
      });

      systemToast.commissionChanged(
        selectedProperty.title, 
        rate, 
        selectedProperty.transactionType
      );
      
      setCommissionDialogOpen(false);
      setSelectedProperty(null);
      setCustomCommissionRate("");
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao definir comissão");
    }
  };

  // Handler para aprovar imóvel
  const handleApprove = async (property: any) => {
    try {
      await approveMutation.mutateAsync({ propertyId: property.id });
      systemToast.propertyApproved(property.title);
      propertiesQuery.refetch();
      pendingQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao aprovar imóvel");
    }
  };

  // Handler para abrir dialog de rejeição
  const openRejectDialog = (property: any) => {
    setSelectedProperty(property);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  // Handler para rejeitar imóvel
  const handleReject = async () => {
    if (!selectedProperty) return;
    
    if (!rejectionReason.trim()) {
      systemToast.warning("Por favor, informe o motivo da rejeição");
      return;
    }

    try {
      await rejectMutation.mutateAsync({ 
        propertyId: selectedProperty.id,
        reason: rejectionReason 
      });
      systemToast.propertyRejected(selectedProperty.title, rejectionReason);
      setRejectDialogOpen(false);
      setSelectedProperty(null);
      setRejectionReason("");
      propertiesQuery.refetch();
      pendingQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao rejeitar imóvel");
    }
  };

  // Abrir dialog de atribuição
  const openAssignDialog = (property: any) => {
    setSelectedProperty(property);
    setSelectedAgentId(property.assignedAgentId?.toString() || "");
    setAssignDialogOpen(true);
  };

  // Abrir dialog de comissão customizada
  const openCommissionDialog = (property: any) => {
    setSelectedProperty(property);
    setCustomCommissionRate(
      property.customCommissionRate !== null 
        ? (property.customCommissionRate / 100).toString() 
        : ""
    );
    setCommissionDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  // Filtrar propriedades
  const filteredProperties = useMemo(() => {
    if (!propertiesQuery.data) return [];
    
    return propertiesQuery.data.filter((property: any) => {
      // Filtro de busca por texto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          property.title?.toLowerCase().includes(searchLower) ||
          property.address?.toLowerCase().includes(searchLower) ||
          property.city?.toLowerCase().includes(searchLower) ||
          property.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filtro por tipo de propriedade
      if (filters.type !== "all" && property.type !== filters.type) return false;
      
      // Filtro por tipo de transação
      if (filters.transactionType !== "all" && property.transactionType !== filters.transactionType) return false;
      
      // Filtro por cidade
      if (filters.city && !property.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
      
      // Filtro por preço mínimo
      if (filters.minPrice) {
        const minPriceCents = parseFloat(filters.minPrice) * 100;
        if (property.price < minPriceCents) return false;
      }
      
      // Filtro por preço máximo
      if (filters.maxPrice) {
        const maxPriceCents = parseFloat(filters.maxPrice) * 100;
        if (property.price > maxPriceCents) return false;
      }
      
      // Filtro por quartos mínimos
      if (filters.minRooms) {
        if (property.rooms < parseInt(filters.minRooms)) return false;
      }
      
      // Filtro por status
      if (filters.status !== "all" && property.status !== filters.status) return false;
      
      return true;
    });
  }, [propertiesQuery.data, filters]);

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "all",
      transactionType: "all",
      city: "",
      minPrice: "",
      maxPrice: "",
      minRooms: "",
      status: "all",
    });
  };

  const hasActiveFilters = filters.search || filters.type !== "all" || filters.transactionType !== "all" || 
    filters.city || filters.minPrice || filters.maxPrice || filters.minRooms || filters.status !== "all";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Propriedades</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Barra de busca e filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por título, endereço ou cidade..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">!</Badge>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Painel de filtros */}
          {showFilters && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs sm:text-sm">Tipo de Imóvel</Label>
                    <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="apartamento">Apartamento</SelectItem>
                        <SelectItem value="casa">Casa</SelectItem>
                        <SelectItem value="terreno">Terreno</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs sm:text-sm">Tipo de Transação</Label>
                    <Select value={filters.transactionType} onValueChange={(v) => setFilters({ ...filters, transactionType: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="aluguel">Aluguel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Cidade</Label>
                    <Input
                      placeholder="Ex: São Paulo"
                      value={filters.city}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Status</Label>
                    <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="vendida">Vendida</SelectItem>
                        <SelectItem value="alugada">Alugada</SelectItem>
                        <SelectItem value="inativa">Inativa</SelectItem>
                        {user?.role === "admin" && (
                          <>
                            <SelectItem value="pendente">⏳ Pendente Aprovação</SelectItem>
                            <SelectItem value="rejeitada">❌ Rejeitada</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Preço Mínimo (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Preço Máximo (R$)</Label>
                    <Input
                      type="number"
                      placeholder="Sem limite"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">Quartos Mínimos</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minRooms}
                      onChange={(e) => setFilters({ ...filters, minRooms: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contador de resultados */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredProperties.length} {filteredProperties.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
              {hasActiveFilters && ` (filtrado de ${propertiesQuery.data?.length || 0})`}
            </p>
          </div>
        </div>

        {(user?.role === "agent" || user?.role === "admin") && (
          <div className="mb-8">
            <Dialog open={open} onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Propriedade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Propriedade" : "Cadastrar Nova Propriedade"}</DialogTitle>
                  <DialogDescription>Preencha os detalhes da propriedade</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <Label className="text-sm">Título</Label>
                      <Input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Apartamento no Centro"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Tipo de Propriedade</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                        <SelectTrigger className="h-10">
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

                    <div>
                      <Label className="text-sm">Tipo de Transação</Label>
                      <Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value as any })}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="venda">Venda</SelectItem>
                          <SelectItem value="aluguel">Aluguel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm">Preço (R$)</Label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Tamanho (m²)</Label>
                      <Input
                        required
                        type="number"
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        placeholder="100"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Quartos</Label>
                      <Input
                        required
                        type="number"
                        value={formData.rooms}
                        onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                        placeholder="3"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Banheiros</Label>
                      <Input
                        required
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        placeholder="2"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Estado (UF)</Label>
                      <Input
                        required
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        placeholder="SP"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Cidade</Label>
                      <Input
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="São Paulo"
                        className="h-10"
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <Label className="text-sm">Endereço</Label>
                      <Input
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua Principal, 123"
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">CEP</Label>
                      <Input
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="01234-567"
                        className="h-10"
                      />
                    </div>

                    {editingId && (
                      <div>
                        <Label className="text-sm">Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativa">Ativa</SelectItem>
                            <SelectItem value="vendida">Vendida</SelectItem>
                            <SelectItem value="alugada">Alugada</SelectItem>
                            <SelectItem value="inativa">Inativa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm">Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva os detalhes da propriedade..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="backyard"
                        checked={formData.hasBackyard}
                        onCheckedChange={(checked) => setFormData({ ...formData, hasBackyard: checked as boolean })}
                      />
                      <Label htmlFor="backyard">Possui quintal</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="living"
                        checked={formData.hasLivingRoom}
                        onCheckedChange={(checked) => setFormData({ ...formData, hasLivingRoom: checked as boolean })}
                      />
                      <Label htmlFor="living">Possui sala de estar</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="kitchen"
                        checked={formData.hasKitchen}
                        onCheckedChange={(checked) => setFormData({ ...formData, hasKitchen: checked as boolean })}
                      />
                      <Label htmlFor="kitchen">Possui cozinha</Label>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Propriedade"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {propertiesQuery.isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando propriedades...</p>
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid gap-4 sm:gap-6">
            {filteredProperties.map((property: any) => (
              <Card key={property.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="cursor-pointer flex-1" onClick={() => setLocation(`/imovel/${property.id}`)}>
                      <CardTitle className="text-lg sm:text-xl hover:text-blue-600 transition-colors">{property.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {property.address}, {property.city} - {property.state}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/imovel/${property.id}`)}
                        title="Ver detalhes"
                        className="h-8 px-2"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </Button>
                    {/* Botões de aprovação para admin - propriedades pendentes */}
                    {user?.role === "admin" && property.status === "pendente" && !property.isApproved && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-600 hover:bg-green-50 h-8"
                          onClick={() => handleApprove(property)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50 h-8"
                          onClick={() => openRejectDialog(property)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </>
                    )}
                    {(user?.role === "agent" || user?.role === "admin") && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImagePropertyId(property.id);
                            setImageDialogOpen(true);
                          }}
                          title="Gerenciar imagens"
                          className="h-8 px-2"
                        >
                          <ImageIcon className="h-4 w-4 text-purple-600" />
                        </Button>
                        {property.status === "ativa" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50 h-8"
                            onClick={() => handleSellOrRent(property)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="hidden xs:inline">{property.transactionType === "venda" ? "Vender" : "Alugar"}</span>
                          </Button>
                        )}
                        {/* Botões apenas para admin */}
                        {user?.role === "admin" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAssignDialog(property)}
                              title="Atribuir corretor"
                              className="h-8 px-2"
                            >
                              <UserPlus className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCommissionDialog(property)}
                              title="Comissão customizada"
                              className="h-8 px-2"
                            >
                              <Percent className="h-4 w-4 text-orange-600" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(property)}
                          className="h-8 px-2"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(property.id)}
                          disabled={deleteMutation.isPending}
                          className="h-8 px-2"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Tipo</p>
                      <p className="font-semibold text-sm sm:text-base capitalize">{property.type}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Transação</p>
                      <p className="font-semibold text-sm sm:text-base capitalize">{property.transactionType}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Preço</p>
                      <p className="font-semibold text-sm sm:text-base">{formatPrice(property.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Tamanho</p>
                      <p className="font-semibold text-sm sm:text-base">{property.size} m²</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Quartos</p>
                      <p className="font-semibold text-sm sm:text-base">{property.rooms}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Banheiros</p>
                      <p className="font-semibold text-sm sm:text-base">{property.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Status</p>
                      <p className="font-semibold text-sm sm:text-base flex items-center gap-2">
                        {property.status === "pendente" && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Clock className="h-4 w-4" />
                            Pendente
                          </span>
                        )}
                        {property.status === "rejeitada" && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            Rejeitada
                          </span>
                        )}
                        {property.status !== "pendente" && property.status !== "rejeitada" && (
                          <span className="capitalize">{property.status}</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Comissão</p>
                      <p className="font-semibold text-sm sm:text-base">
                        {property.customCommissionRate !== null && property.customCommissionRate !== undefined
                          ? <span className="text-orange-600">{property.customCommissionRate / 100}% <span className="text-xs">(custom)</span></span>
                          : <span>{property.transactionType === "venda" ? "8%" : "10%"}</span>
                        }
                      </p>
                    </div>
                  </div>
                  {property.description && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">Descrição</p>
                      <p className="text-gray-700">{property.description}</p>
                    </div>
                  )}
                  <div className="flex gap-2 text-sm text-gray-600">
                    {property.hasBackyard && <span className="bg-gray-100 px-2 py-1 rounded">Quintal</span>}
                    {property.hasLivingRoom && <span className="bg-gray-100 px-2 py-1 rounded">Sala de estar</span>}
                    {property.hasKitchen && <span className="bg-gray-100 px-2 py-1 rounded">Cozinha</span>}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mostrar motivo de rejeição se houver */}
                    {property.status === "rejeitada" && property.rejectionReason && (
                      <div className="col-span-full bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-sm text-red-600 font-semibold">Motivo da Rejeição:</p>
                        <p className="text-sm text-red-700">{property.rejectionReason}</p>
                      </div>
                    )}
                    {property.agentName && (
                      <div>
                        <p className="text-sm text-gray-600">Agente Criador</p>
                        <p className="font-semibold">{property.agentName}</p>
                        {property.agentCreci && (
                          <p className="text-xs text-gray-500">CRECI: {property.agentCreci}</p>
                        )}
                      </div>
                    )}
                    {property.assignedAgentId && (
                      <div>
                        <p className="text-sm text-gray-600">Corretor Atribuído</p>
                        <p className="font-semibold text-blue-600">
                          {property.assignedAgentName || `Corretor #${property.assignedAgentId}`}
                        </p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          Responsável pela venda
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">
                {hasActiveFilters 
                  ? "Nenhum imóvel encontrado com os filtros aplicados" 
                  : "Nenhuma propriedade encontrada"}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Venda/Aluguel */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProperty?.transactionType === "venda" ? "Registrar Venda" : "Registrar Aluguel"}
            </DialogTitle>
            <DialogDescription>
              {selectedProperty?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Preço Anunciado</p>
              <p className="text-xl font-bold">{selectedProperty && formatPrice(selectedProperty.price)}</p>
            </div>
            
            <div>
              <Label>Valor da Transação (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-600">Taxa de Comissão</p>
                {selectedProperty?.customCommissionRate !== null && selectedProperty?.customCommissionRate !== undefined && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    Customizada
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold text-blue-700">
                {selectedProperty && (getCommissionRate(selectedProperty) / 100)}%
              </p>
              <p className="text-sm text-blue-600 mt-2">Valor Estimado da Comissão</p>
              <p className="text-xl font-bold text-blue-700">
                {transactionAmount && !isNaN(parseFloat(transactionAmount)) && selectedProperty
                  ? formatPrice(
                      Math.round(
                        parseFloat(transactionAmount) * 100 *
                        (getCommissionRate(selectedProperty) / 10000)
                      )
                    )
                  : "R$ 0,00"}
              </p>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleConfirmTransaction}
              disabled={createCommissionMutation.isPending || updateMutation.isPending}
            >
              {createCommissionMutation.isPending || updateMutation.isPending
                ? "Processando..."
                : `Confirmar ${selectedProperty?.transactionType === "venda" ? "Venda" : "Aluguel"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Management Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={(open) => {
        setImageDialogOpen(open);
        if (!open) {
          setImagePropertyId(null);
          propertiesQuery.refetch(); // Atualizar lista ao fechar
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-600" />
              Gerenciar Imagens do Imóvel
            </DialogTitle>
            <DialogDescription>
              Adicione até 10 imagens para tornar seu imóvel mais atraente. A primeira imagem será a principal por padrão.
            </DialogDescription>
          </DialogHeader>
          {imagePropertyId && (
            <>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-700">
                  💡 <strong>Dica:</strong> Imóveis com fotos de qualidade recebem até 3x mais visualizações!
                </p>
              </div>
              <ImageUpload 
                propertyId={imagePropertyId} 
                onImagesChange={() => {
                  // Refetch property data if needed
                  propertiesQuery.refetch();
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Atribuição de Corretor (Admin) */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        setAssignDialogOpen(open);
        if (!open) {
          setSelectedProperty(null);
          setSelectedAgentId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Atribuir Corretor ao Imóvel
            </DialogTitle>
            <DialogDescription>
              {selectedProperty?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Imóvel Selecionado</p>
              <p className="font-semibold">{selectedProperty?.title}</p>
              <p className="text-sm text-gray-500">{selectedProperty?.address}, {selectedProperty?.city}</p>
            </div>
            
            <div>
              <Label>Corretor Responsável</Label>
              <Select value={selectedAgentId || "none"} onValueChange={(value) => setSelectedAgentId(value === "none" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um corretor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (remover atribuição)</SelectItem>
                  {agentsQuery.data
                    ?.filter((agent: any) => agent.role === "agent" || agent.role === "admin")
                    .map((agent: any) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name || agent.email || `Usuário #${agent.id}`}
                        {agent.creci && ` (CRECI: ${agent.creci})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                O corretor atribuído terá acesso exclusivo a este imóvel para gerenciar comissões.
              </p>
            </div>

            {selectedProperty?.assignedAgentId && (
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
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleAssignAgent}
                disabled={assignAgentMutation.isPending}
              >
                {assignAgentMutation.isPending ? "Salvando..." : "Confirmar Atribuição"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Comissão Customizada (Admin) */}
      <Dialog open={commissionDialogOpen} onOpenChange={(open) => {
        setCommissionDialogOpen(open);
        if (!open) {
          setSelectedProperty(null);
          setCustomCommissionRate("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-600" />
              Comissão Customizada
            </DialogTitle>
            <DialogDescription>
              {selectedProperty?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Imóvel Selecionado</p>
              <p className="font-semibold">{selectedProperty?.title}</p>
              <p className="text-sm text-gray-500">
                Tipo de transação: {selectedProperty?.transactionType === "venda" ? "Venda" : "Aluguel"}
              </p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Taxa Padrão</p>
              <p className="text-lg font-bold text-blue-700">
                {selectedProperty?.transactionType === "venda" ? "8%" : "10%"}
              </p>
            </div>

            <div>
              <Label>Taxa de Comissão Customizada (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={customCommissionRate}
                onChange={(e) => setCustomCommissionRate(e.target.value)}
                placeholder="Ex: 6.5 para 6.5%"
              />
              <p className="text-xs text-gray-500 mt-1">
                Deixe em branco para usar a taxa padrão. Use valores entre 0 e 100.
              </p>
            </div>

            {selectedProperty?.customCommissionRate !== null && selectedProperty?.customCommissionRate !== undefined && (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-700">
                  Taxa atual customizada: <strong>{selectedProperty.customCommissionRate / 100}%</strong>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCommissionDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleSetCustomCommission}
                disabled={setCustomCommissionMutation.isPending}
              >
                {setCustomCommissionMutation.isPending ? "Salvando..." : "Salvar Comissão"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição de Imóvel (Admin) */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => {
        setRejectDialogOpen(open);
        if (!open) {
          setSelectedProperty(null);
          setRejectionReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejeitar Imóvel
            </DialogTitle>
            <DialogDescription>
              {selectedProperty?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Imóvel a ser rejeitado</p>
              <p className="font-semibold">{selectedProperty?.title}</p>
              <p className="text-sm text-gray-500">{selectedProperty?.address}, {selectedProperty?.city}</p>
              {selectedProperty?.agentName && (
                <p className="text-sm text-gray-500 mt-2">Criado por: <strong>{selectedProperty.agentName}</strong></p>
              )}
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                ⚠️ Ao rejeitar este imóvel, ele não será publicado e o corretor será notificado sobre o motivo.
              </p>
            </div>

            <div>
              <Label>Motivo da Rejeição *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique o motivo da rejeição..."
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este motivo será visível para o corretor que cadastrou o imóvel.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRejectDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                {rejectMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

