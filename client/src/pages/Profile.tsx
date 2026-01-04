import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { ArrowLeft, User, Mail, Phone, Award, Shield, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, refetch } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    creci: user?.creci || "",
  });
  const [isEditing, setIsEditing] = useState(false);

  // Atualizar formulário quando o user mudar
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        creci: user.creci || "",
      });
    }
  }, [user]);

  const updateProfileMutation = trpc.users.updateProfile.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error("Erro: Usuário não identificado");
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        creci: formData.creci || undefined,
      });

      toast.success("Perfil atualizado com sucesso!");
      setIsEditing(false);
      // Refetch user data
      if (refetch) refetch();
    } catch (error: any) {
      toast.error("Falha ao atualizar perfil: " + (error?.message || "Erro desconhecido"));
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "agent":
        return "Agente Imobiliário";
      case "user":
        return "Usuário";
      default:
        return role;
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>Gerencie suas informações de conta</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Seu nome"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {user?.isAgent && (
                  <div>
                    <Label>CRECI</Label>
                    <Input
                      value={formData.creci}
                      onChange={(e) => setFormData({ ...formData, creci: e.target.value })}
                      placeholder="Número CRECI"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: user?.name || "",
                        email: user?.email || "",
                        phone: user?.phone || "",
                        creci: user?.creci || "",
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nome</p>
                  <p className="text-lg font-semibold">{user?.name || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-semibold">{user?.email || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Telefone</p>
                  <p className="text-lg font-semibold">{user?.phone || "-"}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Papel</p>
                  <p className="text-lg font-semibold">{getRoleLabel(user?.role || "user")}</p>
                </div>

                {user?.isAgent && (
                  <div>
                    <p className="text-sm text-gray-600">CRECI</p>
                    <p className="text-lg font-semibold">{user?.creci || "-"}</p>
                  </div>
                )}

                <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                  Editar Perfil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">ID da Conta</p>
                <p className="text-lg font-semibold font-mono">{user?.id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Criada em</p>
                <p className="text-lg font-semibold">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Último acesso</p>
                <p className="text-lg font-semibold">
                  {user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR") : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

