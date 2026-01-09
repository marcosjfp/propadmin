import { useState } from "react";
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
import { Link } from "wouter";
import { ArrowLeft, Trash2, UserCheck } from "lucide-react";

export default function Users() {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [creci, setCreci] = useState("");

  const usersQuery = trpc.users.list.useQuery();
  const updateMutation = trpc.users.update.useMutation();
  const deleteMutation = trpc.users.delete.useMutation();
  const promoteMutation = trpc.users.promoteToAgent.useMutation();

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

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar este usuário?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        alert("Usuário deletado");
        usersQuery.refetch();
      } catch (error) {
        alert("Falha ao deletar usuário");
      }
    }
  };

  const handlePromoteToAgent = async (userId: number) => {
    if (!creci.trim()) {
      alert("Por favor, insira o número CRECI");
      return;
    }

    try {
      await promoteMutation.mutateAsync({ id: userId, creci });
      alert("Usuário promovido a agente");
      setPromoteDialogOpen(false);
      setCreci("");
      setSelectedUser(null);
      usersQuery.refetch();
    } catch (error) {
      alert("Falha ao promover usuário");
    }
  };

  const handleUpdateRole = async (userId: number, newRole: string) => {
    try {
      await updateMutation.mutateAsync({
        id: userId,
        role: newRole as "user" | "agent" | "admin",
      });
      alert("Papel atualizado");
      usersQuery.refetch();
    } catch (error) {
      alert("Falha ao atualizar papel");
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
        {usersQuery.isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando usuários...</p>
          </div>
        ) : usersQuery.data && usersQuery.data.length > 0 ? (
          <div className="space-y-4">
            {usersQuery.data.map((u) => (
              <Card key={u.id}>
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div>
                      <CardTitle className="text-lg">{u.name || "Sem nome"}</CardTitle>
                      <CardDescription className="text-sm">{u.email || "Sem email"}</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!u.isAgent && u.role === "user" && (
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
                        onClick={() => handleDelete(u.id)}
                        disabled={deleteMutation.isPending}
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
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Telefone</p>
                      <p className="font-semibold text-sm sm:text-base">{u.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">CRECI</p>
                      <p className="font-semibold text-sm sm:text-base">{u.creci || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Status</p>
                      <p className="font-semibold text-sm sm:text-base">{u.isAgent ? "Agente Ativo" : "Não é Agente"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Nenhum usuário encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

