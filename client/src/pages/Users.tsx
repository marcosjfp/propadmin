import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import {
  ArrowLeft,
  UserCheck,
  Trash2,
  ShieldCheck,
  User as UserIcon,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/StateComponents";

export default function Users() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number; name: string } | null>(null);
  const [creci, setCreci] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const usersQuery = trpc.users.list.useQuery({ page, pageSize });
  const pendingUsersQuery = trpc.users.listPending.useQuery();

  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();
  const promoteMutation = trpc.users.promoteToAgent.useMutation();
  const approveMutation = trpc.users.approve.useMutation();
  const rejectMutation = trpc.users.reject.useMutation();

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

  const openDeleteDialog = (id: number, name: string) => {
    setUserToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteMutation.mutateAsync({ id: userToDelete.id });
      toast.success("Usuário deletado com sucesso");
      usersQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Falha ao deletar usuário");
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handlePromoteToAgent = async (userId: number) => {
    if (!creci.trim()) {
      toast.warning("Por favor, insira o número CRECI");
      return;
    }

    try {
      await promoteMutation.mutateAsync({ id: userId, creci });
      toast.success("Usuário promovido a agente com sucesso");
      setPromoteDialogOpen(false);
      setCreci("");
      setSelectedUser(null);
      usersQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Falha ao promover usuário");
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await updateMutation.mutateAsync({
        id: userId,
        role: newRole as "user" | "agent" | "admin",
      });
      toast.success("Papel atualizado com sucesso");
      usersQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Falha ao atualizar papel");
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await approveMutation.mutateAsync({ id: userId });
      toast.success("Usuário aprovado");
      pendingUsersQuery.refetch();
      usersQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar usuário");
    }
  };

  const handleReject = async (userId: number) => {
    if (!window.confirm("Deseja realmente rejeitar este usuário? A conta não poderá fazer login.")) return;
    try {
      await rejectMutation.mutateAsync({ id: userId });
      toast.success("Usuário rejeitado");
      pendingUsersQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar usuário");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8">
        <Tabs defaultValue="ativos" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="ativos">Usuários Ativos</TabsTrigger>
            <TabsTrigger value="pendentes">
              Aprovações Pendentes
              {pendingUsersQuery.data && pendingUsersQuery.data.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs">
                  {pendingUsersQuery.data.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ativos">
            {usersQuery.isLoading ? (
              <LoadingState message="Carregando usuários..." />
            ) : usersQuery.isError ? (
              <ErrorState 
                message="Erro ao carregar usuários" 
                onRetry={() => usersQuery.refetch()} 
              />
            ) : usersQuery.data?.items && usersQuery.data.items.length > 0 ? (
              <div className="space-y-4">
                {usersQuery.data.items.map((u) => (
                  <Card key={u.id}>
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div>
                          <CardTitle className="text-lg">{u.name || "Sem nome"}</CardTitle>
                          <CardDescription className="text-sm">{u.email || "Sem email"}</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {u.role === "user" && u.status === 'active' && (
                            <Dialog open={promoteDialogOpen && selectedUser?.id === u.id} onOpenChange={(open) => {
                              setPromoteDialogOpen(open);
                              if (open) setSelectedUser(u);
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8">
                                  <UserCheck className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Promover a Agente</span>
                                  <span className="sm:hidden">Promover</span>
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[95vw] sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Promover a Agente</DialogTitle>
                                  <DialogDescription>
                                    Insira o número CRECI para promover {u.name} a agente
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Número CRECI</Label>
                                    <Input
                                      value={creci}
                                      onChange={(e) => setCreci(e.target.value)}
                                      placeholder="Ex: 123456"
                                    />
                                  </div>
                                  <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handlePromoteToAgent(u.id)}
                                    disabled={promoteMutation.isPending}
                                  >
                                    {promoteMutation.isPending ? "Promovendo..." : "Promover"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => openDeleteDialog(u.id, u.name || "este usuário")}
                            disabled={deleteMutation.isPending}
                            aria-label={`Deletar usuário ${u.name || "sem nome"}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600">Papel</p>
                          <Select value={u.role} onValueChange={(value) => handleUpdateRole(u.id, value)}>
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Usuário</SelectItem>
                              <SelectItem value="agent">Agente</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                          {u.role === 'agent' || u.role === 'admin' ? (
                            <div className="flex flex-col gap-1 items-start">
                              <p className="text-xs sm:text-sm text-gray-600">Categoria</p>
                              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1.5">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Corretor</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              <p className="text-xs sm:text-sm text-gray-600">Categoria</p>
                              <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full mt-1.5">
                                <UserIcon className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Cliente</span>
                              </div>
                            </div>
                          )}
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600">Usuário Login</p>
                          <p className="font-semibold text-sm sm:text-base">{u.username || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-600">Status</p>
                          <p className="font-semibold text-sm sm:text-base capitalize">{u.status}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Pagination Controls */}
                {usersQuery.data?.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500">
                      Mostrando página {page} de {usersQuery.data.totalPages} ({usersQuery.data.totalCount} usuários)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(usersQuery.data.totalPages, p + 1))}
                        disabled={page === usersQuery.data.totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Nenhum usuário encontrado</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pendentes">
            {pendingUsersQuery.isLoading ? (
              <LoadingState message="Buscando usuários pendentes..." />
            ) : pendingUsersQuery.data && pendingUsersQuery.data.length > 0 ? (
              <div className="space-y-4">
                {pendingUsersQuery.data.map((u) => (
                  <Card key={u.id} className="border-orange-200 bg-orange-50/30">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 flex-grow">
                          <div>
                            <p className="text-xs text-gray-500">Nome Misto</p>
                            <p className="font-semibold">{u.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="font-medium">{u.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Usuário de Login</p>
                            <p className="font-medium">{u.username}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Quer Ser</p>
                            <p className="font-medium capitalize">{u.role === 'agent' ? 'Corretor' : 'Cliente'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <Button 
                            variant="default" 
                            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                            onClick={() => handleApprove(u.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Aprovar
                          </Button>
                          <Button 
                            variant="destructive" 
                            className="flex-1 sm:flex-none"
                            onClick={() => handleReject(u.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Rejeitar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-600">Nenhum usuário aguardando aprovação.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {userToDelete?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

