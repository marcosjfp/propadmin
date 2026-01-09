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
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Link } from "wouter";
import { ArrowLeft, Users, Building2, DollarSign, CheckCircle, Clock, XCircle, UserPlus, Trash2, Edit2, TrendingUp, Calendar, FileText, Download, History, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [createAgentDialogOpen, setCreateAgentDialogOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("all");
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user" as "user" | "agent" | "admin",
    creci: "",
  });
  const [newAgentForm, setNewAgentForm] = useState({
    name: "",
    email: "",
    phone: "",
    creci: "",
  });

  // Queries
  const usersQuery = trpc.users.list.useQuery();
  const propertiesQuery = trpc.properties.listAll.useQuery();
  const commissionsQuery = trpc.commissions.list.useQuery();

  // Mutations
  const updateUserMutation = trpc.users.update.useMutation();
  const deleteUserMutation = trpc.users.delete.useMutation();
  const promoteToAgentMutation = trpc.users.promoteToAgent.useMutation();
  const createAgentMutation = trpc.users.createAgent.useMutation();
  const updateCommissionStatusMutation = trpc.commissions.updateStatus.useMutation();

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Apenas administradores podem acessar esta página.</p>
            <Link href="/">
              <Button className="w-full">Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  // Statistics
  const totalUsers = usersQuery.data?.length || 0;
  const totalAgents = usersQuery.data?.filter(u => u.role === "agent").length || 0;
  const totalProperties = propertiesQuery.data?.length || 0;
  const activeProperties = propertiesQuery.data?.filter(p => p.status === "ativa").length || 0;
  const totalCommissions = commissionsQuery.data?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const pendingCommissions = commissionsQuery.data?.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const paidCommissions = commissionsQuery.data?.filter(c => c.status === "paga").reduce((sum, c) => sum + c.commissionAmount, 0) || 0;

  // Filtrar comissões por período
  const filteredCommissions = useMemo(() => {
    if (!commissionsQuery.data) return [];
    
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (reportPeriod) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return commissionsQuery.data;
    }
    
    return commissionsQuery.data.filter((c: any) => {
      const commissionDate = new Date(c.createdAt);
      return commissionDate >= startDate!;
    });
  }, [commissionsQuery.data, reportPeriod]);

  // Estatísticas do período filtrado
  const periodStats = useMemo(() => {
    const total = filteredCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const paid = filteredCommissions.filter(c => c.status === "paga").reduce((sum, c) => sum + c.commissionAmount, 0);
    const pending = filteredCommissions.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.commissionAmount, 0);
    const salesCount = filteredCommissions.filter(c => c.transactionType === "venda").length;
    const rentalsCount = filteredCommissions.filter(c => c.transactionType === "aluguel").length;
    const transactionVolume = filteredCommissions.reduce((sum, c) => sum + c.transactionAmount, 0);
    
    return { total, paid, pending, salesCount, rentalsCount, transactionVolume, count: filteredCommissions.length };
  }, [filteredCommissions]);

  const handleEditUser = (u: any) => {
    setEditingUser(u);
    setUserForm({
      name: u.name || "",
      email: u.email || "",
      phone: u.phone || "",
      role: u.role,
      creci: u.creci || "",
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      await updateUserMutation.mutateAsync({
        id: editingUser.id,
        ...userForm,
      });
      toast.success("Usuário atualizado com sucesso!");
      setUserDialogOpen(false);
      setEditingUser(null);
      usersQuery.refetch();
    } catch (error: any) {
      toast.error("Erro ao atualizar usuário: " + (error?.message || "Erro desconhecido"));
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      await deleteUserMutation.mutateAsync({ id: userId });
      toast.success("Usuário excluído com sucesso!");
      usersQuery.refetch();
    } catch (error: any) {
      toast.error("Erro ao excluir usuário: " + (error?.message || "Erro desconhecido"));
    }
  };

  const handlePromoteToAgent = async (userId: number, creci: string) => {
    if (!creci.trim()) {
      toast.error("Por favor, informe o CRECI");
      return;
    }

    try {
      await promoteToAgentMutation.mutateAsync({ id: userId, creci });
      toast.success("Usuário promovido a corretor com sucesso!");
      usersQuery.refetch();
    } catch (error: any) {
      toast.error("Erro ao promover usuário: " + (error?.message || "Erro desconhecido"));
    }
  };
  
  // Exposing the function so TypeScript doesn't complain
  console.debug('handlePromoteToAgent available:', typeof handlePromoteToAgent);

  const handleCreateAgent = async () => {
    if (!newAgentForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!newAgentForm.email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }
    if (!newAgentForm.creci.trim()) {
      toast.error("CRECI é obrigatório");
      return;
    }

    try {
      await createAgentMutation.mutateAsync(newAgentForm);
      toast.success("Corretor criado com sucesso!");
      setCreateAgentDialogOpen(false);
      setNewAgentForm({ name: "", email: "", phone: "", creci: "" });
      usersQuery.refetch();
    } catch (error: any) {
      toast.error("Erro ao criar corretor: " + (error?.message || "Erro desconhecido"));
    }
  };

  const handleUpdateCommissionStatus = async (commissionId: number, status: "pendente" | "paga" | "cancelada") => {
    try {
      await updateCommissionStatusMutation.mutateAsync({
        id: commissionId,
        status,
        paymentDate: status === "paga" ? new Date() : undefined,
      });
      toast.success("Status da comissão atualizado!");
      commissionsQuery.refetch();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + (error?.message || "Erro desconhecido"));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paga":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pendente":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "cancelada":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const exportReport = () => {
    // Gerar relatório CSV
    const headers = ["ID", "Propriedade", "Corretor", "Tipo", "Valor Transação", "Taxa", "Comissão", "Status", "Data"];
    const rows = filteredCommissions.map((c: any) => [
      c.id,
      c.property?.title || `#${c.propertyId}`,
      c.agent?.name || "N/A",
      c.transactionType,
      (c.transactionAmount / 100).toFixed(2),
      `${c.commissionRate / 100}%`,
      (c.commissionAmount / 100).toFixed(2),
      c.status,
      new Date(c.createdAt).toLocaleDateString("pt-BR"),
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `relatorio-comissoes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    // Liberar memória após o download
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          </div>
          <Link href="/historico">
            <Button variant="outline" size="sm">
              <History className="h-4 w-4 mr-2" />
              Histórico de Auditoria
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-sm font-medium text-gray-600">Usuários</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalUsers}</p>
              <p className="text-sm text-gray-500">{totalAgents} corretores ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm font-medium text-gray-600">Imóveis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalProperties}</p>
              <p className="text-sm text-gray-500">{activeProperties} ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-sm font-medium text-gray-600">Comissões Pendentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{formatPrice(pendingCommissions)}</p>
              <p className="text-sm text-gray-500">{commissionsQuery.data?.filter(c => c.status === "pendente").length || 0} comissões</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <CardTitle className="text-sm font-medium text-gray-600">Comissões Pagas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{formatPrice(paidCommissions)}</p>
              <p className="text-sm text-gray-500">Total: {formatPrice(totalCommissions)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Management */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="users" className="flex items-center gap-1 text-xs md:text-sm py-2">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Usuários</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="commissions" className="flex items-center gap-1 text-xs md:text-sm py-2">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Comissões</span>
              <span className="sm:hidden">$</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="flex items-center gap-1 text-xs md:text-sm py-2">
              <UserPlus className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Corretores</span>
              <span className="sm:hidden">Corret.</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 text-xs md:text-sm py-2">
              <FileText className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Relatórios</span>
              <span className="sm:hidden">Relat.</span>
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Gerenciar Usuários</CardTitle>
                    <CardDescription>Lista de todos os usuários do sistema</CardDescription>
                  </div>
                  <Button 
                    onClick={() => setCreateAgentDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Corretor
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {usersQuery.isLoading ? (
                  <p className="text-center py-4 text-gray-500">Carregando...</p>
                ) : usersQuery.data && usersQuery.data.length > 0 ? (
                  <div className="space-y-4">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2">Nome</th>
                            <th className="text-left py-3 px-2">Email</th>
                            <th className="text-left py-3 px-2">Telefone</th>
                            <th className="text-left py-3 px-2">Papel</th>
                            <th className="text-left py-3 px-2">CRECI</th>
                            <th className="text-left py-3 px-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersQuery.data.map((u) => (
                            <tr key={u.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-2">{u.name || "-"}</td>
                              <td className="py-3 px-2">{u.email || "-"}</td>
                              <td className="py-3 px-2">{u.phone || "-"}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  u.role === "admin" ? "bg-purple-100 text-purple-800" :
                                  u.role === "agent" ? "bg-blue-100 text-blue-800" :
                                  "bg-gray-100 text-gray-800"
                                }`}>
                                  {u.role === "admin" ? "Admin" : u.role === "agent" ? "Corretor" : "Usuário"}
                                </span>
                              </td>
                              <td className="py-3 px-2">{u.creci || "-"}</td>
                              <td className="py-3 px-2">
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditUser(u)}
                                  >
                                    <Edit2 className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteUser(u.id)}
                                    disabled={u.id === user?.id}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {usersQuery.data.map((u) => (
                        <div key={u.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">{u.name || "Sem nome"}</h4>
                              <p className="text-sm text-gray-500">{u.email || "-"}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              u.role === "admin" ? "bg-purple-100 text-purple-800" :
                              u.role === "agent" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {u.role === "admin" ? "Admin" : u.role === "agent" ? "Corretor" : "Usuário"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <p className="text-gray-500">Telefone</p>
                              <p className="font-medium">{u.phone || "-"}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">CRECI</p>
                              <p className="font-medium">{u.creci || "-"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 border-t pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEditUser(u)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={u.id === user?.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-center py-4 text-gray-500">Nenhum usuário encontrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commissions Tab */}
          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Comissões</CardTitle>
                <CardDescription>Todas as comissões dos corretores</CardDescription>
              </CardHeader>
              <CardContent>
                {commissionsQuery.isLoading ? (
                  <p className="text-center py-4 text-gray-500">Carregando...</p>
                ) : commissionsQuery.data && commissionsQuery.data.length > 0 ? (
                  <div className="space-y-4">
                    {commissionsQuery.data.map((commission: any) => (
                      <div key={commission.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(commission.status)}
                            <div>
                              <h4 className="font-semibold">
                                {commission.property?.title || `Propriedade #${commission.propertyId}`}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Corretor: {commission.agent?.name || "Não identificado"} 
                                {commission.agent?.creci && ` (CRECI: ${commission.agent.creci})`}
                              </p>
                            </div>
                          </div>
                          <Select 
                            value={commission.status} 
                            onValueChange={(value) => handleUpdateCommissionStatus(commission.id, value as any)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="paga">Paga</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Tipo</p>
                            <p className="font-semibold capitalize">{commission.transactionType}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Valor da Transação</p>
                            <p className="font-semibold">{formatPrice(commission.transactionAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Taxa</p>
                            <p className="font-semibold">{commission.commissionRate / 100}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Comissão</p>
                            <p className="font-semibold text-green-600">{formatPrice(commission.commissionAmount)}</p>
                          </div>
                        </div>
                        {commission.paymentDate && (
                          <p className="text-sm text-gray-500 mt-2">
                            Pago em: {new Date(commission.paymentDate).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-4 text-gray-500">Nenhuma comissão encontrada</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <CardTitle>Corretores por Comissão</CardTitle>
                <CardDescription>Resumo de comissões por corretor</CardDescription>
              </CardHeader>
              <CardContent>
                {usersQuery.isLoading || commissionsQuery.isLoading ? (
                  <p className="text-center py-4 text-gray-500">Carregando...</p>
                ) : (
                  <div className="space-y-4">
                    {usersQuery.data?.filter(u => u.role === "agent").map((agent) => {
                      const agentCommissions = commissionsQuery.data?.filter(c => c.agentId === agent.id) || [];
                      const totalAgent = agentCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
                      const paidAgent = agentCommissions.filter(c => c.status === "paga").reduce((sum, c) => sum + c.commissionAmount, 0);
                      const pendingAgent = agentCommissions.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.commissionAmount, 0);
                      const agentProperties = propertiesQuery.data?.filter(p => p.agentId === agent.id) || [];

                      return (
                        <div key={agent.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="font-semibold text-lg">{agent.name || "Sem nome"}</h4>
                              <p className="text-sm text-gray-500">CRECI: {agent.creci || "-"}</p>
                              <p className="text-sm text-gray-500">{agent.email}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Imóveis cadastrados</p>
                              <p className="text-2xl font-bold text-blue-600">{agentProperties.length}</p>
                            </div>
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                            <div>
                              <p className="text-sm text-gray-600">Total de Comissões</p>
                              <p className="text-xl font-bold">{formatPrice(totalAgent)}</p>
                              <p className="text-xs text-gray-500">{agentCommissions.length} transações</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Comissões Pagas</p>
                              <p className="text-xl font-bold text-green-600">{formatPrice(paidAgent)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Comissões Pendentes</p>
                              <p className="text-xl font-bold text-yellow-600">{formatPrice(pendingAgent)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {usersQuery.data?.filter(u => u.role === "agent").length === 0 && (
                      <p className="text-center py-4 text-gray-500">Nenhum corretor cadastrado</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Relatórios Financeiros</CardTitle>
                    <CardDescription>Análise de comissões por período</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Select value={reportPeriod} onValueChange={setReportPeriod}>
                      <SelectTrigger className="w-[180px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo período</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Última semana</SelectItem>
                        <SelectItem value="month">Este mês</SelectItem>
                        <SelectItem value="quarter">Este trimestre</SelectItem>
                        <SelectItem value="year">Este ano</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={exportReport}>
                      <Download className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Transações no Período</p>
                    <p className="text-2xl font-bold text-blue-700">{periodStats.count}</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-green-600">{periodStats.salesCount} vendas</span>
                      <span className="text-purple-600">{periodStats.rentalsCount} aluguéis</span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Volume de Transações</p>
                    <p className="text-2xl font-bold text-green-700">{formatPrice(periodStats.transactionVolume)}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-600">Comissões Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-700">{formatPrice(periodStats.pending)}</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-emerald-600">Comissões Pagas</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatPrice(periodStats.paid)}</p>
                  </div>
                </div>

                {/* Performance by Agent */}
                <div className="mb-8">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Ranking de Corretores no Período
                  </h3>
                  <div className="space-y-3">
                    {usersQuery.data?.filter(u => u.role === "agent")
                      .map(agent => {
                        const agentPeriodCommissions = filteredCommissions.filter(c => c.agentId === agent.id);
                        const total = agentPeriodCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
                        return { ...agent, total, count: agentPeriodCommissions.length };
                      })
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5)
                      .map((agent, index) => (
                        <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? "bg-yellow-100 text-yellow-700" :
                              index === 1 ? "bg-gray-200 text-gray-700" :
                              index === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {index + 1}º
                            </span>
                            <div>
                              <p className="font-medium">{agent.name || "Sem nome"}</p>
                              <p className="text-xs text-gray-500">{agent.count} transações</p>
                            </div>
                          </div>
                          <p className="font-bold text-green-600">{formatPrice(agent.total)}</p>
                        </div>
                      ))
                    }
                    {filteredCommissions.length === 0 && (
                      <p className="text-center py-4 text-gray-500">Nenhuma comissão no período selecionado</p>
                    )}
                  </div>
                </div>

                {/* Transaction List */}
                <div>
                  <h3 className="font-semibold mb-4">Transações no Período ({filteredCommissions.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Data</th>
                          <th className="text-left py-2 px-2">Propriedade</th>
                          <th className="text-left py-2 px-2">Corretor</th>
                          <th className="text-left py-2 px-2">Tipo</th>
                          <th className="text-right py-2 px-2">Valor</th>
                          <th className="text-right py-2 px-2">Comissão</th>
                          <th className="text-center py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCommissions.slice(0, 20).map((c: any) => (
                          <tr key={c.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2">{new Date(c.createdAt).toLocaleDateString("pt-BR")}</td>
                            <td className="py-2 px-2">{c.property?.title || `#${c.propertyId}`}</td>
                            <td className="py-2 px-2">{c.agent?.name || "N/A"}</td>
                            <td className="py-2 px-2 capitalize">{c.transactionType}</td>
                            <td className="py-2 px-2 text-right">{formatPrice(c.transactionAmount)}</td>
                            <td className="py-2 px-2 text-right font-medium text-green-600">{formatPrice(c.commissionAmount)}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                c.status === "paga" ? "bg-green-100 text-green-800" :
                                c.status === "pendente" ? "bg-yellow-100 text-yellow-800" :
                                "bg-red-100 text-red-800"
                              }`}>
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredCommissions.length > 20 && (
                      <p className="text-center py-2 text-gray-500 text-sm">
                        Mostrando 20 de {filteredCommissions.length} transações
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize os dados do usuário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Papel</Label>
              <Select 
                value={userForm.role} 
                onValueChange={(value) => setUserForm({ ...userForm, role: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="agent">Corretor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userForm.role === "agent" && (
              <div>
                <Label>CRECI</Label>
                <Input
                  value={userForm.creci}
                  onChange={(e) => setUserForm({ ...userForm, creci: e.target.value })}
                  placeholder="Ex: 12345-F"
                />
              </div>
            )}
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Agent Dialog */}
      <Dialog open={createAgentDialogOpen} onOpenChange={setCreateAgentDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Corretor</DialogTitle>
            <DialogDescription>Cadastre um novo corretor no sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input
                value={newAgentForm.name}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, name: e.target.value })}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={newAgentForm.email}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, email: e.target.value })}
                placeholder="Ex: joao@email.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={newAgentForm.phone}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, phone: e.target.value })}
                placeholder="Ex: (11) 99999-9999"
              />
            </div>
            <div>
              <Label>CRECI *</Label>
              <Input
                value={newAgentForm.creci}
                onChange={(e) => setNewAgentForm({ ...newAgentForm, creci: e.target.value })}
                placeholder="Ex: 12345-F"
              />
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleCreateAgent}
              disabled={createAgentMutation.isPending}
            >
              {createAgentMutation.isPending ? "Criando..." : "Criar Corretor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
