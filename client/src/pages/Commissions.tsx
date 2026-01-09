import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { systemToast } from "@/lib/toast";
import { formatPrice, getStatusLabel } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/StateComponents";

export default function Commissions() {
  const { user } = useAuth();
  const commissionsQuery = user?.role === "admin" ? trpc.commissions.list.useQuery() : trpc.commissions.myCommissions.useQuery();
  const updateStatusMutation = trpc.commissions.updateStatus.useMutation();

  const handleStatusChange = async (commissionId: number, newStatus: string) => {
    if (user?.role !== "admin") {
      systemToast.warning("Apenas administradores podem alterar status");
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: commissionId,
        status: newStatus as "pendente" | "paga" | "cancelada",
      });
      
      const commission = commissionsQuery.data?.find((c: any) => c.id === commissionId);
      systemToast.commissionStatusChanged(newStatus, commission?.property?.title || "Imóvel");
      commissionsQuery.refetch();
    } catch (error: any) {
      systemToast.error(error?.message || "Falha ao atualizar status");
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

  const totalCommissions = commissionsQuery.data?.reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const paidCommissions = commissionsQuery.data?.filter(c => c.status === "paga").reduce((sum, c) => sum + c.commissionAmount, 0) || 0;
  const pendingCommissions = commissionsQuery.data?.filter(c => c.status === "pendente").reduce((sum, c) => sum + c.commissionAmount, 0) || 0;

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
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === "admin" ? "Todas as Comissões" : "Minhas Comissões"}
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{formatPrice(totalCommissions)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Comissões Pagas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{formatPrice(paidCommissions)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Comissões Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{formatPrice(pendingCommissions)}</p>
            </CardContent>
          </Card>
        </div>

        {commissionsQuery.isLoading ? (
          <LoadingState message="Carregando comissões..." />
        ) : commissionsQuery.isError ? (
          <ErrorState 
            message="Erro ao carregar comissões" 
            onRetry={() => commissionsQuery.refetch()} 
          />
        ) : commissionsQuery.data && commissionsQuery.data.length > 0 ? (
          <div className="space-y-4">
            {commissionsQuery.data.map((commission) => (
              <Card key={commission.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(commission.status)}
                      <div>
                        <CardTitle className="text-lg">Propriedade #{commission.propertyId}</CardTitle>
                        <CardDescription>
                          Transação: {commission.transactionType === "venda" ? "Venda" : "Aluguel"}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Valor da Transação</p>
                      <p className="font-semibold">{formatPrice(commission.transactionAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Taxa de Comissão</p>
                      <p className="font-semibold">{commission.commissionRate / 100}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Valor da Comissão</p>
                      <p className="font-semibold text-blue-600">{formatPrice(commission.commissionAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-semibold capitalize">{getStatusLabel(commission.status)}</p>
                    </div>
                    {user?.role === "admin" && (
                      <div>
                        <p className="text-sm text-gray-600">Ação</p>
                        <Select value={commission.status} onValueChange={(value) => handleStatusChange(commission.id, value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="paga">Paga</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  {commission.paymentDate && (
                    <div className="text-sm text-gray-600">
                      Data de Pagamento: {new Date(commission.paymentDate).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Nenhuma comissão encontrada</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

