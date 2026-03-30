import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { APP_TITLE } from "@/const";
import { Link, useLocation } from "wouter";
import { Home as HomeIcon, UserPlus } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Signup() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

  const signupMutation = trpc.auth.signup.useMutation();

  // If already authenticated, redirect to home
  if (!loading && isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !email || !password || !role) {
      toast.error("Por favor, preencha todos os campos corretamente");
      return;
    }

    try {
      await signupMutation.mutateAsync({ name, username, email, password, role: role as 'user' | 'agent' });
      toast.success("Cadastro realizado com sucesso. Sua conta está pendente de aprovação!");
      setLocation("/login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="bg-blue-600 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-lg">
            <HomeIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{APP_TITLE}</h1>
          <p className="text-gray-600">Sistema de gestão imobiliária</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-center">Criar Conta</CardTitle>
            <CardDescription className="text-center">
              Junte-se a nós para gerenciar propriedades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={signupMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={signupMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    placeholder="Seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={signupMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={signupMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Conta</Label>
                <Select value={role} onValueChange={setRole} disabled={signupMutation.isPending}>
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Sou Cliente</SelectItem>
                    <SelectItem value="agent">Sou Corretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 mt-2"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending ? "Cadastrando..." : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Cadastrar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2 relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gray-200">
            <div className="text-sm text-center text-gray-500 pt-4">
              Já tem uma conta?{" "}
              <Link href="/login">
                <span className="text-blue-600 hover:underline cursor-pointer font-medium">Faça Login</span>
              </Link>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} {APP_TITLE}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
