import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  History, 
  Search, 
  Filter,
  User,
  Home,
  DollarSign,
  Image,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye
} from "lucide-react";

export default function AuditHistory() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Query para listar logs
  const logsQuery = trpc.audit.list.useQuery({
    page,
    limit: 20,
    entityType: filters.entityType as any || undefined,
    action: filters.action || undefined,
    search: filters.search || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  // Query para estatísticas
  const statsQuery = trpc.audit.getStats.useQuery({
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  });

  // Query para ações recentes
  const recentQuery = trpc.audit.getRecent.useQuery({ limit: 5 });

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Apenas administradores podem acessar o histórico de auditoria.</p>
            <Link href="/">
              <Button className="w-full">Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      // Usuários
      user_created: "bg-green-100 text-green-800",
      user_updated: "bg-blue-100 text-blue-800",
      user_deleted: "bg-red-100 text-red-800",
      user_role_changed: "bg-purple-100 text-purple-800",
      user_login: "bg-cyan-100 text-cyan-800",
      user_logout: "bg-gray-100 text-gray-800",
      // Propriedades
      property_created: "bg-green-100 text-green-800",
      property_updated: "bg-blue-100 text-blue-800",
      property_deleted: "bg-red-100 text-red-800",
      property_status_changed: "bg-yellow-100 text-yellow-800",
      property_sold: "bg-emerald-100 text-emerald-800",
      property_rented: "bg-indigo-100 text-indigo-800",
      // Imagens
      image_uploaded: "bg-green-100 text-green-800",
      image_deleted: "bg-red-100 text-red-800",
      image_primary_changed: "bg-blue-100 text-blue-800",
      // Comissões
      commission_created: "bg-green-100 text-green-800",
      commission_status_changed: "bg-yellow-100 text-yellow-800",
      commission_paid: "bg-emerald-100 text-emerald-800",
      commission_cancelled: "bg-red-100 text-red-800",
    };
    
    const actionLabels: Record<string, string> = {
      user_created: "Usuário Criado",
      user_updated: "Usuário Atualizado",
      user_deleted: "Usuário Excluído",
      user_role_changed: "Papel Alterado",
      user_login: "Login",
      user_logout: "Logout",
      property_created: "Imóvel Criado",
      property_updated: "Imóvel Atualizado",
      property_deleted: "Imóvel Excluído",
      property_status_changed: "Status Alterado",
      property_sold: "Imóvel Vendido",
      property_rented: "Imóvel Alugado",
      image_uploaded: "Imagem Enviada",
      image_deleted: "Imagem Excluída",
      image_primary_changed: "Imagem Principal",
      commission_created: "Comissão Criada",
      commission_status_changed: "Status Alterado",
      commission_paid: "Comissão Paga",
      commission_cancelled: "Comissão Cancelada",
    };

    return (
      <Badge className={actionColors[action] || "bg-gray-100 text-gray-800"}>
        {actionLabels[action] || action}
      </Badge>
    );
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "user":
        return <User className="h-4 w-4" />;
      case "property":
        return <Home className="h-4 w-4" />;
      case "commission":
        return <DollarSign className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const handleClearFilters = () => {
    setFilters({
      entityType: "",
      action: "",
      search: "",
      startDate: "",
      endDate: "",
    });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="h-6 w-6" />
              Histórico de Auditoria
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              logsQuery.refetch();
              statsQuery.refetch();
              recentQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{statsQuery.data?.total || 0}</div>
              <p className="text-sm text-gray-600">Total de Eventos</p>
            </CardContent>
          </Card>
          {statsQuery.data?.byEntityType.map((stat) => (
            <Card key={stat.entityType}>
              <CardContent className="pt-6 flex items-center gap-3">
                {getEntityIcon(stat.entityType)}
                <div>
                  <div className="text-2xl font-bold">{stat.count}</div>
                  <p className="text-sm text-gray-600 capitalize">{stat.entityType}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              <div>
                <Label>Busca</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Tipo de Entidade</Label>
                <Select
                  value={filters.entityType}
                  onValueChange={(value) => setFilters({ ...filters, entityType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="user">Usuários</SelectItem>
                    <SelectItem value="property">Imóveis</SelectItem>
                    <SelectItem value="commission">Comissões</SelectItem>
                    <SelectItem value="image">Imagens</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={handleClearFilters} className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos ({logsQuery.data?.pagination.total || 0})</CardTitle>
            <CardDescription>
              Histórico de todas as ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : logsQuery.data?.logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum evento encontrado
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsQuery.data?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.userRole}</Badge>
                            <span className="text-sm">{log.userName || "Sistema"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEntityIcon(log.entityType)}
                            <span className="capitalize">{log.entityType}</span>
                            {log.entityId && (
                              <span className="text-gray-400">#{log.entityId}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.description}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginação */}
                {logsQuery.data && logsQuery.data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-600">
                      Página {logsQuery.data.pagination.page} de {logsQuery.data.pagination.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === logsQuery.data.pagination.totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Detalhes do Evento
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Data/Hora</Label>
                  <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Usuário</Label>
                  <p className="font-medium">{selectedLog.userName || "Sistema"}</p>
                  <Badge variant="outline" className="mt-1">{selectedLog.userRole}</Badge>
                </div>
                <div>
                  <Label className="text-gray-500">Ação</Label>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Entidade</Label>
                  <p className="font-medium capitalize">
                    {selectedLog.entityType} #{selectedLog.entityId}
                  </p>
                  {selectedLog.entityName && (
                    <p className="text-sm text-gray-600">{selectedLog.entityName}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="text-gray-500">Descrição</Label>
                <p className="font-medium">{selectedLog.description}</p>
              </div>

              {selectedLog.previousValue && (
                <div>
                  <Label className="text-gray-500">Valor Anterior</Label>
                  <pre className="bg-red-50 p-3 rounded-lg text-sm overflow-x-auto border border-red-200">
                    {JSON.stringify(JSON.parse(selectedLog.previousValue), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <Label className="text-gray-500">Novo Valor</Label>
                  <pre className="bg-green-50 p-3 rounded-lg text-sm overflow-x-auto border border-green-200">
                    {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
