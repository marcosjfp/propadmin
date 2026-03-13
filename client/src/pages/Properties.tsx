import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc, RouterOutput } from "@/lib/trpc";
import { systemToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyFilters } from "@/components/PropertyFilters";
import { PropertyFormDialog } from "@/components/PropertyFormDialog";
import { PropertyCommissionDialog } from "@/components/PropertyCommissionDialog";
import { RejectPropertyDialog } from "@/components/RejectPropertyDialog";
import { AssignAgentDialog } from "@/components/AssignAgentDialog";
import { SellPropertyDialog } from "@/components/SellPropertyDialog";

import { Link } from "wouter";
import { Plus, ArrowLeft, ImageIcon } from "lucide-react";

export default function Properties() {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [commissionDialogOpen, setCommissionDialogOpen] = useState(false);
  const [imagePropertyId, setImagePropertyId] = useState<number | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<RouterOutput["properties"]["listAll"]["items"][0] | null>(null);
  const [transactionAmount, setTransactionAmount] = useState("");
  const [customCommissionRate, setCustomCommissionRate] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);

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
    status: "ativa" as "pendente" | "ativa" | "vendida" | "alugada" | "inativa" | "rejeitada",
  });

  const { filters, updateFilter, clearFilters, hasActiveFilters, queryParams } = usePropertyFilters();
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const propertiesQuery = trpc.properties.listAll.useQuery({
    ...queryParams,
    page,
    pageSize,
  });
  const citiesQuery = trpc.properties.listCities.useQuery();
  const createMutation = trpc.properties.create.useMutation();
  const updateMutation = trpc.properties.update.useMutation();
  const deleteMutation = trpc.properties.delete.useMutation();
  const assignAgentMutation = trpc.properties.assignAgent.useMutation();
  const setCustomCommissionMutation = trpc.properties.setCustomCommission.useMutation();
  const approveMutation = trpc.properties.approve.useMutation();
  const rejectMutation = trpc.properties.reject.useMutation();
  const createCommissionMutation = trpc.commissions.create.useMutation();

  const isAdmin = user?.role === "admin";

  // Query para listar agentes (para admin atribuir)
  const agentsQuery = trpc.users.list.useQuery(undefined, {
    enabled: isAdmin
  });

  const propertyItems = useMemo(() => {
    return propertiesQuery.data?.items ?? [];
  }, [propertiesQuery.data]);

  const availableCities = useMemo(() => {
    return citiesQuery.data ?? [];
  }, [citiesQuery.data]);

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
    setEditingId(property.id);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const price = Math.round(parseFloat(formData.price) * 100);
      const size = parseInt(formData.size);
      const rooms = parseInt(formData.rooms);
      const bathrooms = parseInt(formData.bathrooms);

      if (isNaN(price) || isNaN(size) || isNaN(rooms) || isNaN(bathrooms)) {
        systemToast.warning("Por favor, preencha os campos numéricos corretamente");
        return;
      }

      if (formData.state.length !== 2) {
        systemToast.warning("O estado (UF) deve ter exatamente 2 caracteres (ex: SP, RJ, MG)");
        return;
      }

      const propertyData = {
        title: formData.title,
        description: formData.description || undefined,
        type: formData.type as any,
        transactionType: formData.transactionType as any,
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
        setImagePropertyId(result.id);
        setImageDialogOpen(true);
      }

      setOpen(false);
      resetForm();
      propertiesQuery.refetch();
    } catch (error: any) {
      console.error("Erro ao criar/atualizar propriedade:", error);
      systemToast.error(error?.message || "Erro ao processar solicitação");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta propriedade?")) {
      try {
        const data = propertiesQuery.data;
        const items = data && 'items' in data ? data.items : (Array.isArray(data) ? data : undefined);
        const property = items?.find((p: any) => p.id === id);
        await deleteMutation.mutateAsync({ id });
        systemToast.deleted(property?.title || "Propriedade", "Imóvel");
        propertiesQuery.refetch();
      } catch (error: any) {
        systemToast.error(error?.message || "Falha ao deletar propriedade");
      }
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ propertyId: id });
      systemToast.success("Propriedade aprovada com sucesso");
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao aprovar propriedade");
    }
  };
  const handleOpenAssignDialog = (property: RouterOutput["properties"]["listAll"]["items"][0]) => {
    setSelectedProperty(property);
    setSelectedAgentId(property.assignedAgentId?.toString() || "");
    setAssignDialogOpen(true);
  };

  const handleOpenCommissionDialog = (property: RouterOutput["properties"]["listAll"]["items"][0]) => {
    setSelectedProperty(property);
    setCustomCommissionRate(property.customCommissionRate ? (property.customCommissionRate / 100).toString() : "");
    setCommissionDialogOpen(true);
  };

  const handleOpenSellDialog = (property: RouterOutput["properties"]["listAll"]["items"][0]) => {
    setSelectedProperty(property);
    setTransactionAmount((property.price / 100).toString());
    setSellDialogOpen(true);
  };

  const handleOpenImageDialog = (id: number) => {
    setImagePropertyId(id);
    setImageDialogOpen(true);
  };

  const handleReject = (property: RouterOutput["properties"]["listAll"]["items"][0]) => {
    setSelectedProperty(property);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async (reason: string) => {
    if (!selectedProperty) return;
    try {
      await rejectMutation.mutateAsync({ propertyId: selectedProperty.id, reason });
      systemToast.propertyRejected("Imóvel rejeitado", reason);
      setRejectDialogOpen(false);
      setSelectedProperty(null);
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao rejeitar imóvel");
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedProperty) return;
    try {
      await assignAgentMutation.mutateAsync({
        propertyId: selectedProperty.id,
        assignedAgentId: selectedAgentId ? parseInt(selectedAgentId) : null
      });
      systemToast.success("Corretor atribuído com sucesso");
      setAssignDialogOpen(false);
      setSelectedProperty(null);
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao atribuir corretor");
    }
  };

  const handleSetCustomCommission = async () => {
    if (!selectedProperty) return;
    try {
      const rate = customCommissionRate ? Math.round(parseFloat(customCommissionRate) * 100) : null;
      await setCustomCommissionMutation.mutateAsync({
        propertyId: selectedProperty.id,
        customCommissionRate: rate
      });
      systemToast.success("Taxa de comissão atualizada");
      setCommissionDialogOpen(false);
      setSelectedProperty(null);
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao atualizar comissão");
    }
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
      await createCommissionMutation.mutateAsync({
        propertyId: selectedProperty.id,
        transactionType: selectedProperty.transactionType,
        transactionAmount: amount,
      });
      await updateMutation.mutateAsync({
        id: selectedProperty.id,
        status: newStatus,
      });
      systemToast.success(`${selectedProperty.transactionType === "venda" ? "Venda" : "Aluguel"} registrada com sucesso`);
      setSellDialogOpen(false);
      setSelectedProperty(null);
      propertiesQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Erro ao registrar transação");
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price / 100);
  };

  if (authLoading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Propriedades</h1>
        </div>
        {(user?.role === "agent" || user?.role === "admin") && (
          <Button onClick={() => { resetForm(); setOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Novo Imóvel
          </Button>
        )}
      </div>

      <div className="space-y-6">
        <PropertyFilters
          showFilters={true}
          setShowFilters={() => {}}
          filters={filters}
          updateFilter={updateFilter}
          clearFilters={clearFilters}
          availableCities={availableCities}
        />

        {propertiesQuery.isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando propriedades...</p>
          </div>
        ) : propertyItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {propertyItems.map((property: any) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isAdmin={isAdmin}
                  currentUserId={user?.id}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onAssign={handleOpenAssignDialog}
                  onImage={handleOpenImageDialog}
                  onCommission={handleOpenCommissionDialog}
                  onSell={handleOpenSellDialog}
                  isDeleting={deleteMutation.isPending && selectedProperty?.id === property.id}
                  isApproving={approveMutation.isPending && selectedProperty?.id === property.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {propertiesQuery.data && propertiesQuery.data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 bg-white p-4 rounded-lg shadow-sm border">
                <p className="text-sm text-gray-500">
                  Mostrando página {page} de {propertiesQuery.data.totalPages} ({propertiesQuery.data.totalCount} imóveis)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setPage(p => Math.min(propertiesQuery.data.totalPages, p + 1)); window.scrollTo(0, 0); }}
                    disabled={page === propertiesQuery.data.totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-600">Nenhum imóvel encontrado com os filtros selecionados.</p>
            {hasActiveFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2 text-blue-600">
                Limpar todos os filtros
              </Button>
            )}
          </div>
        )}
      </div>

      <PropertyFormDialog
        open={open}
        onOpenChange={setOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        isAdmin={isAdmin}
      />

      <PropertyCommissionDialog
        open={commissionDialogOpen}
        onOpenChange={setCommissionDialogOpen}
        selectedProperty={selectedProperty}
        customCommissionRate={customCommissionRate}
        setCustomCommissionRate={setCustomCommissionRate}
        onSave={handleSetCustomCommission}
        isPending={setCustomCommissionMutation.isPending}
      />

      <RejectPropertyDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        property={selectedProperty}
        onReject={handleConfirmReject}
        isPending={rejectMutation.isPending}
      />

      <AssignAgentDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        property={selectedProperty}
        agents={agentsQuery.data?.items || []}
        selectedAgentId={selectedAgentId}
        onAgentChange={setSelectedAgentId}
        onAssign={handleAssignAgent}
        isPending={assignAgentMutation.isPending}
      />

      <SellPropertyDialog
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        property={selectedProperty}
        transactionAmount={transactionAmount}
        setTransactionAmount={setTransactionAmount}
        onConfirm={handleConfirmTransaction}
        isPending={createCommissionMutation.isPending || updateMutation.isPending}
        formatPrice={formatPrice}
      />

      <Dialog open={imageDialogOpen} onOpenChange={(open) => {
        setImageDialogOpen(open);
        if (!open) { setImagePropertyId(null); propertiesQuery.refetch(); }
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
              <ImageUpload propertyId={imagePropertyId} onImagesChange={() => propertiesQuery.refetch()} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
