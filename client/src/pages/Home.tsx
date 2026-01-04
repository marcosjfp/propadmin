import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";
import { Building2, Users, BarChart3, LogOut, Settings, LayoutDashboard } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-16 mx-auto mb-4" />}
              <h1 className="text-5xl font-bold text-gray-900 mb-4">{APP_TITLE}</h1>
              <p className="text-xl text-gray-600 mb-8">
                Gerencie suas propriedades imobiliárias com facilidade e acompanhe suas comissões em tempo real
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <Building2 className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Imóveis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Cadastre e gerencie imóveis para venda ou aluguel</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Corretores</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Gerencie corretores de imóveis e suas responsabilidades</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Comissões</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Acompanhe comissões de venda (8%) e locação (10%)</p>
                </CardContent>
              </Card>
            </div>

            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
              onClick={() => {
                // Use dev-login endpoint if OAuth is not configured
                const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
                if (!oauthPortalUrl || oauthPortalUrl === "") {
                  window.location.href = "http://localhost:3000/api/dev-login";
                } else {
                  window.location.href = getLoginUrl();
                }
              }}
            >
              Acessar Plataforma
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8" />}
            <h1 className="text-2xl font-bold text-gray-900">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Bem-vindo, {user?.name || "Usuário"}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/propriedades">
            <Card className="hover:shadow-lg cursor-pointer transition-shadow">
              <CardHeader>
                <Building2 className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Imóveis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Gerenciar Imóveis</p>
              </CardContent>
            </Card>
          </Link>

          {user?.role === "admin" && (
            <Link href="/admin">
              <Card className="hover:shadow-lg cursor-pointer transition-shadow border-2 border-purple-200">
                <CardHeader>
                  <Settings className="h-8 w-8 text-purple-600 mb-2" />
                  <CardTitle>Painel Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Gerenciar usuários, corretores e comissões</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {user?.role === "admin" && (
            <Link href="/usuarios">
              <Card className="hover:shadow-lg cursor-pointer transition-shadow">
                <CardHeader>
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Gerenciar usuários e corretores</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {user?.role === "admin" && (
            <Link href="/comissoes">
              <Card className="hover:shadow-lg cursor-pointer transition-shadow">
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Comissões</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Acompanhar todas as comissões</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {user?.role === "agent" && (
            <Link href="/meu-dashboard">
              <Card className="hover:shadow-lg cursor-pointer transition-shadow border-2 border-blue-200">
                <CardHeader>
                  <LayoutDashboard className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Meu Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Ver estatísticas e metas</p>
                </CardContent>
              </Card>
            </Link>
          )}

          {user?.role === "agent" && (
            <Link href="/minhas-comissoes">
              <Card className="hover:shadow-lg cursor-pointer transition-shadow">
                <CardHeader>
                  <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                  <CardTitle>Minhas Comissões</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Acompanhar minhas comissões</p>
                </CardContent>
              </Card>
            </Link>
          )}

          <Link href="/perfil">
            <Card className="hover:shadow-lg cursor-pointer transition-shadow">
              <CardHeader>
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Meu Perfil</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Editar meu perfil</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
            <CardDescription>Seus dados de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Nome</p>
                <p className="text-lg font-semibold">{user?.name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold">{user?.email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Papel</p>
                <p className="text-lg font-semibold">
                  {user?.role === "admin" ? "Administrador" : user?.role === "agent" ? "Corretor" : "Usuário"}
                </p>
              </div>
              {user?.isAgent && (
                <div>
                  <p className="text-sm text-gray-600">CRECI</p>
                  <p className="text-lg font-semibold">{user?.creci || "-"}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

