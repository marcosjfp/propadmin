import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Home,
  Target,
  Award
} from "lucide-react";

export default function AgentDashboard() {
  const { user } = useAuth();
  const propertiesQuery = trpc.properties.myProperties.useQuery();
  const commissionsQuery = trpc.commissions.myCommissions.useQuery();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price / 100);
  };

  // Estatísticas de propriedades
  const totalProperties = propertiesQuery.data?.length || 0;
  const activeProperties = propertiesQuery.data?.filter(p => p.status === "ativa").length || 0;
  const soldProperties = propertiesQuery.data?.filter(p => p.status === "vendida").length || 0;
  const rentedProperties = propertiesQuery.data?.filter(p => p.status === "alugada").length || 0;

  // Estatísticas de comissões
  const totalCommissions = commissionsQuery.data?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const paidCommissions = commissionsQuery.data?.filter(c => c.status === "paga").reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const pendingCommissions = commissionsQuery.data?.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const totalTransactions = commissionsQuery.data?.length || 0;

  // Valor total em propriedades ativas
  const totalPropertyValue = propertiesQuery.data?.filter(p => p.status === "ativa").reduce((sum, p) => sum + p.price, 0) || 0;

  // Meta fictícia para demonstração (pode ser configurável)
  const monthlyGoal = 5000000; // R$ 50.000,00
  const goalProgress = Math.min((paidCommissions / monthlyGoal) * 100, 100);

  // Últimas comissões
  const recentCommissions = commissionsQuery.data?.slice(0, 5) || [];

  // Últimas propriedades
  const recentProperties = propertiesQuery.data?.slice(0, 5) || [];

  if (user?.role !== "agent") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Esta página é exclusiva para corretores.</p>
            <Link href="/">
              <Button className="w-full">Voltar ao Início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Meu Dashboard</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Bem-vindo */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Olá, {user?.name || "Corretor"}! 👋
          </h2>
          <p className="text-gray-600 mt-1">
            CRECI: {user?.creci || "Não informado"} | {user?.email}
          </p>
        </div>

        {/* Cards principais */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Meus Imóveis</CardTitle>
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalProperties}</p>
              <p className="text-sm text-gray-500">{activeProperties} ativos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Total Comissões</CardTitle>
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatPrice(totalCommissions)}</p>
              <p className="text-sm text-gray-500">{totalTransactions} transações</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">A Receber</CardTitle>
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{formatPrice(pendingCommissions)}</p>
              <p className="text-sm text-gray-500">
                {commissionsQuery.data?.filter(c => c.status === "pendente").length || 0} pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">Já Recebido</CardTitle>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-600">{formatPrice(paidCommissions)}</p>
              <p className="text-sm text-gray-500">
                {commissionsQuery.data?.filter(c => c.status === "paga").length || 0} pagas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Meta mensal e estatísticas de propriedades */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Meta mensal */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                <CardTitle>Meta Mensal</CardTitle>
              </div>
              <CardDescription>Acompanhe seu progresso</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Progresso</span>
                    <span className="text-sm font-semibold">{goalProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={goalProgress} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Meta</p>
                    <p className="text-lg font-bold">{formatPrice(monthlyGoal)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Atingido</p>
                    <p className="text-lg font-bold text-green-600">{formatPrice(paidCommissions)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas de imóveis */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                <CardTitle>Estatísticas de Imóveis</CardTitle>
              </div>
              <CardDescription>Resumo da sua carteira</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ativos</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${totalProperties > 0 ? (activeProperties / totalProperties) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8">{activeProperties}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Vendidos</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${totalProperties > 0 ? (soldProperties / totalProperties) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8">{soldProperties}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Alugados</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${totalProperties > 0 ? (rentedProperties / totalProperties) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8">{rentedProperties}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Valor total em carteira (ativos)</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPrice(totalPropertyValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Últimas atividades */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Últimas comissões */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <CardTitle>Últimas Comissões</CardTitle>
                </div>
                <Link href="/minhas-comissoes">
                  <Button variant="outline" size="sm">Ver todas</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {commissionsQuery.isLoading ? (
                <p className="text-center py-4 text-gray-500">Carregando...</p>
              ) : recentCommissions.length > 0 ? (
                <div className="space-y-3">
                  {recentCommissions.map((commission: any) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          commission.status === "paga" ? "bg-green-500" :
                          commission.status === "pendente" ? "bg-yellow-500" : "bg-red-500"
                        }`} />
                        <div>
                          <p className="font-medium text-sm">
                            {commission.property?.title || `Imóvel #${commission.propertyId}`}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{commission.transactionType}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-green-600">{formatPrice(commission.commissionAmount)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Nenhuma comissão ainda</p>
              )}
            </CardContent>
          </Card>

          {/* Últimos imóveis */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle>Últimos Imóveis</CardTitle>
                </div>
                <Link href="/propriedades">
                  <Button variant="outline" size="sm">Ver todos</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {propertiesQuery.isLoading ? (
                <p className="text-center py-4 text-gray-500">Carregando...</p>
              ) : recentProperties.length > 0 ? (
                <div className="space-y-3">
                  {recentProperties.map((property: any) => (
                    <div key={property.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          property.status === "ativa" ? "bg-blue-500" :
                          property.status === "vendida" ? "bg-green-500" :
                          property.status === "alugada" ? "bg-purple-500" : "bg-gray-400"
                        }`} />
                        <div>
                          <p className="font-medium text-sm">{property.title}</p>
                          <p className="text-xs text-gray-500">{property.city} - {property.state}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">{formatPrice(property.price)}</p>
                        <p className="text-xs text-gray-500 capitalize">{property.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">Nenhum imóvel cadastrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Conquistas */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <CardTitle>Conquistas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {totalProperties >= 1 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                  <span className="text-xl">🏠</span>
                  <span className="text-sm font-medium text-blue-700">Primeiro Imóvel</span>
                </div>
              )}
              {totalProperties >= 5 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full">
                  <span className="text-xl">🏘️</span>
                  <span className="text-sm font-medium text-blue-700">Carteira em Crescimento</span>
                </div>
              )}
              {soldProperties >= 1 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                  <span className="text-xl">💰</span>
                  <span className="text-sm font-medium text-green-700">Primeira Venda</span>
                </div>
              )}
              {paidCommissions >= 1000000 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-full">
                  <span className="text-xl">⭐</span>
                  <span className="text-sm font-medium text-yellow-700">Corretor 10K+</span>
                </div>
              )}
              {rentedProperties >= 1 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 rounded-full">
                  <span className="text-xl">🔑</span>
                  <span className="text-sm font-medium text-purple-700">Primeiro Aluguel</span>
                </div>
              )}
              {totalTransactions === 0 && totalProperties === 0 && (
                <p className="text-gray-500 text-sm">Comece a cadastrar imóveis para desbloquear conquistas!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
