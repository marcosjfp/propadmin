import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
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
import { ArrowLeft, Plus, Trash2, Edit2, DollarSign, Search, X, Eye, Filter, ImageIcon } from "lucide-react";

export default function Properties() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  console.log("User atual:", user);
  const [open, setOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imagePropertyId, setImagePropertyId] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
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

  const propertiesQuery = user?.role === "agent" ? trpc.properties.myProperties.useQuery() : trpc.properties.list.useQuery();
  const createMutation = trpc.properties.create.useMutation();
  const updateMutation = trpc.properties.update.useMutation();
  const deleteMutation = trpc.properties.delete.useMutation();
  const createCommissionMutation = trpc.commissions.create.useMutation();

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
        alert("Propriedade atualizada com sucesso");
      } else {
        await createMutation.mutateAsync(propertyData);
        alert("Propriedade criada com sucesso");
      }

      setOpen(false);
      resetForm();
      propertiesQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar/atualizar propriedade:", error);
      const errorMessage = error?.message || error?.data?.message || "Erro desconhecido";
      alert(editingId ? `Falha ao atualizar propriedade: ${errorMessage}` : `Falha ao criar propriedade: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta propriedade?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        alert("Propriedade deletada");
        propertiesQuery.refetch();
      } catch (error) {
        alert("Falha ao deletar propriedade");
      }
    }
  };

  const handleSellOrRent = (property: any) => {
    setSelectedProperty(property);
    setTransactionAmount((property.price / 100).toString());
    setSellDialogOpen(true);
  };

  const handleConfirmTransaction = async () => {
    if (!selectedProperty) return;

    const amount = Math.round(parseFloat(transactionAmount) * 100);
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor, informe um valor válido");
      return;
    }

    // Taxa de comissão: 8% para venda, 10% para aluguel
    const commissionRate = selectedProperty.transactionType === "venda" ? 800 : 1000;
    const newStatus = selectedProperty.transactionType === "venda" ? "vendida" : "alugada";

    try {
      // Criar comissão
      await createCommissionMutation.mutateAsync({
        propertyId: selectedProperty.id,
        transactionType: selectedProperty.transactionType,
        transactionAmount: amount,
        commissionRate,
      });

      // Atualizar status do imóvel
      await updateMutation.mutateAsync({
        id: selectedProperty.id,
        status: newStatus,
      });

      const commissionValue = (amount * commissionRate) / 10000;
      alert(`${selectedProperty.transactionType === "venda" ? "Venda" : "Aluguel"} registrado com sucesso!\n\nComissão gerada: ${formatPrice(commissionValue)}`);
      
      setSellDialogOpen(false);
      setSelectedProperty(null);
      setTransactionAmount("");
      propertiesQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao registrar transação:", error);
      alert("Erro ao registrar transação: " + (error?.message || "Erro desconhecido"));
    }
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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Propriedades</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Tipo de Imóvel</Label>
                    <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                      <SelectTrigger>
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
                  <div>
                    <Label>Tipo de Transação</Label>
                    <Select value={filters.transactionType} onValueChange={(v) => setFilters({ ...filters, transactionType: v })}>
                      <SelectTrigger>
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
                    <Label>Cidade</Label>
                    <Input
                      placeholder="Ex: São Paulo"
                      value={filters.city}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="vendida">Vendida</SelectItem>
                        <SelectItem value="alugada">Alugada</SelectItem>
                        <SelectItem value="inativa">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preço Mínimo (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Preço Máximo (R$)</Label>
                    <Input
                      type="number"
                      placeholder="Sem limite"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Quartos Mínimos</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minRooms}
                      onChange={(e) => setFilters({ ...filters, minRooms: e.target.value })}
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
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar Propriedade" : "Cadastrar Nova Propriedade"}</DialogTitle>
                  <DialogDescription>Preencha os detalhes da propriedade</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Apartamento no Centro"
                      />
                    </div>

                    <div>
                      <Label>Tipo de Propriedade</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
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

                    <div>
                      <Label>Tipo de Transação</Label>
                      <Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="venda">Venda</SelectItem>
                          <SelectItem value="aluguel">Aluguel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Preço (R$)</Label>
                      <Input
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label>Tamanho (m²)</Label>
                      <Input
                        required
                        type="number"
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        placeholder="100"
                      />
                    </div>

                    <div>
                      <Label>Quartos</Label>
                      <Input
                        required
                        type="number"
                        value={formData.rooms}
                        onChange={(e) => setFormData({ ...formData, rooms: e.target.value })}
                        placeholder="3"
                      />
                    </div>

                    <div>
                      <Label>Banheiros</Label>
                      <Input
                        required
                        type="number"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                        placeholder="2"
                      />
                    </div>

                    <div>
                      <Label>Estado (UF)</Label>
                      <Input
                        required
                        maxLength={2}
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        placeholder="SP"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Endereço</Label>
                      <Input
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua Principal, 123"
                      />
                    </div>

                    <div>
                      <Label>Cidade</Label>
                      <Input
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>

                    <div>
                      <Label>CEP</Label>
                      <Input
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="01234-567"
                      />
                    </div>

                    {editingId && (
                      <div>
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                          <SelectTrigger>
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
                    <Label>Descrição</Label>
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
          <div className="grid gap-6">
            {filteredProperties.map((property: any) => (
              <Card key={property.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="cursor-pointer" onClick={() => setLocation(`/imovel/${property.id}`)}>
                      <CardTitle className="hover:text-blue-600 transition-colors">{property.title}</CardTitle>
                      <CardDescription>
                        {property.address}, {property.city} - {property.state}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/imovel/${property.id}`)}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </Button>
                    {(user?.role === "agent" || user?.role === "admin") && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImagePropertyId(property.id);
                            setImageDialogOpen(true);
                          }}
                          title="Gerenciar imagens"
                        >
                          <ImageIcon className="h-4 w-4 text-purple-600" />
                        </Button>
                        {property.status === "ativa" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleSellOrRent(property)}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            {property.transactionType === "venda" ? "Vender" : "Alugar"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(property)}
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(property.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Tipo</p>
                      <p className="font-semibold capitalize">{property.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Transação</p>
                      <p className="font-semibold capitalize">{property.transactionType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Preço</p>
                      <p className="font-semibold">{formatPrice(property.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tamanho</p>
                      <p className="font-semibold">{property.size} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Quartos</p>
                      <p className="font-semibold">{property.rooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Banheiros</p>
                      <p className="font-semibold">{property.bathrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold capitalize">{property.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Comissão</p>
                      <p className="font-semibold">{property.transactionType === "venda" ? "8%" : "10%"}</p>
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
                  {property.agentName && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">Agente Responsável</p>
                      <p className="font-semibold">{property.agentName}</p>
                      {property.agentCreci && (
                        <p className="text-xs text-gray-500">CRECI: {property.agentCreci}</p>
                      )}
                    </div>
                  )}
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
              <p className="text-sm text-blue-600">Taxa de Comissão</p>
              <p className="text-lg font-bold text-blue-700">
                {selectedProperty?.transactionType === "venda" ? "8%" : "10%"}
              </p>
              <p className="text-sm text-blue-600 mt-2">Valor Estimado da Comissão</p>
              <p className="text-xl font-bold text-blue-700">
                {transactionAmount && !isNaN(parseFloat(transactionAmount))
                  ? formatPrice(
                      Math.round(
                        parseFloat(transactionAmount) * 100 *
                        (selectedProperty?.transactionType === "venda" ? 0.08 : 0.10)
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
        if (!open) setImagePropertyId(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-600" />
              Gerenciar Imagens do Imóvel
            </DialogTitle>
            <DialogDescription>
              Adicione até 10 imagens. A primeira imagem será a principal por padrão.
            </DialogDescription>
          </DialogHeader>
          {imagePropertyId && (
            <ImageUpload 
              propertyId={imagePropertyId} 
              onImagesChange={() => {
                // Refetch property data if needed
                propertiesQuery.refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

