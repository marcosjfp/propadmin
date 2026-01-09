import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Home as HomeIcon, Shield, Briefcase, User, LogIn } from "lucide-react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Se já estiver autenticado, redireciona para home
  if (!loading && isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleLogin = (userType?: string) => {
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    
    if (!oauthPortalUrl || oauthPortalUrl === "") {
      // Use login direto de desenvolvimento com tipo de usuário
      const url = userType 
        ? `/api/dev-login?role=${userType}`
        : "/api/dev-login-page";
      window.location.href = url;
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 rounded-2xl p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-lg">
            <HomeIcon className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{APP_TITLE}</h1>
          <p className="text-gray-600">Sistema de gestão imobiliária</p>
        </div>

        {/* Cards de seleção de perfil */}
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Admin */}
          <Card 
            className="hover:shadow-xl cursor-pointer transition-all transform hover:-translate-y-1 border-2 hover:border-purple-400"
            onClick={() => handleLogin("admin")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-purple-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-2">
                <Shield className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Administrador</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-sm">
                Acesso completo ao sistema. Gerencie usuários, corretores, imóveis e comissões.
              </CardDescription>
              <Button 
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("admin");
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar como Admin
              </Button>
            </CardContent>
          </Card>

          {/* Corretor */}
          <Card 
            className="hover:shadow-xl cursor-pointer transition-all transform hover:-translate-y-1 border-2 hover:border-blue-400"
            onClick={() => handleLogin("agent")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-blue-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-2">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Corretor</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-sm">
                Cadastre e gerencie seus imóveis, acompanhe suas vendas e comissões.
              </CardDescription>
              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("agent");
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar como Corretor
              </Button>
            </CardContent>
          </Card>

          {/* Usuário */}
          <Card 
            className="hover:shadow-xl cursor-pointer transition-all transform hover:-translate-y-1 border-2 hover:border-green-400"
            onClick={() => handleLogin("user")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-green-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mb-2">
                <User className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-lg">Usuário</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-sm">
                Visualize imóveis disponíveis e entre em contato com corretores.
              </CardDescription>
              <Button 
                className="w-full mt-4 bg-green-600 hover:bg-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogin("user");
                }}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar como Usuário
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {APP_TITLE}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
