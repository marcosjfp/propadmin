import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info, Clock, Ban } from "lucide-react";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

interface TransactionToastData {
  propertyTitle: string;
  transactionType: 'venda' | 'aluguel';
  transactionAmount: number;
  commissionRate: number;
  commissionAmount: number;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price / 100);
};

export const systemToast = {
  // Sucesso genérico
  success: (message: string, options?: ToastOptions) => {
    toast.success(options?.title || "Sucesso!", {
      description: message,
      duration: options?.duration || 4000,
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      className: "border-l-4 border-l-green-500",
    });
  },

  // Erro genérico
  error: (message: string, options?: ToastOptions) => {
    toast.error(options?.title || "Erro", {
      description: message,
      duration: options?.duration || 5000,
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      className: "border-l-4 border-l-red-500",
    });
  },

  // Aviso
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(options?.title || "Atenção", {
      description: message,
      duration: options?.duration || 4500,
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      className: "border-l-4 border-l-yellow-500",
    });
  },

  // Informativo
  info: (message: string, options?: ToastOptions) => {
    toast.info(options?.title || "Informação", {
      description: message,
      duration: options?.duration || 4000,
      icon: <Info className="h-5 w-5 text-blue-500" />,
      className: "border-l-4 border-l-blue-500",
    });
  },

  // Loading com promise
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },

  // Toast para transação de imóvel (venda/aluguel) - Mostra valores atualizados
  transaction: (data: TransactionToastData) => {
    const isVenda = data.transactionType === 'venda';
    
    toast.success(
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <span className="font-semibold text-green-700">
            {isVenda ? 'Venda Registrada!' : 'Aluguel Registrado!'}
          </span>
        </div>
        
        <div className="text-sm text-gray-700 font-medium">
          {data.propertyTitle}
        </div>
        
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Valor da Transação</p>
            <p className="font-bold text-gray-900">{formatPrice(data.transactionAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Taxa de Comissão</p>
            <p className="font-bold text-gray-900">{data.commissionRate / 100}%</p>
          </div>
        </div>
        
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-600 uppercase tracking-wide">Comissão Gerada</p>
          <p className="text-xl font-bold text-green-700">{formatPrice(data.commissionAmount)}</p>
        </div>
      </div>,
      {
        duration: 8000,
        className: "w-80",
      }
    );
  },

  // Toast para atribuição de imóvel
  propertyAssigned: (propertyTitle: string, agentName: string | null) => {
    if (agentName) {
      toast.success(
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
            <span className="font-semibold text-blue-700">Imóvel Atribuído!</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">"{propertyTitle}"</span> foi atribuído ao corretor{" "}
            <span className="font-medium text-blue-600">{agentName}</span>
          </p>
        </div>,
        {
          duration: 5000,
          className: "border-l-4 border-l-blue-500",
        }
      );
    } else {
      toast.info(
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <span className="font-semibold text-gray-700">Atribuição Removida</span>
          </div>
          <p className="text-sm text-gray-600">
            A atribuição do imóvel <span className="font-medium">"{propertyTitle}"</span> foi removida.
          </p>
        </div>,
        {
          duration: 4000,
        }
      );
    }
  },

  // Toast para alteração de comissão
  commissionChanged: (propertyTitle: string, rate: number | null, transactionType: string) => {
    const defaultRate = transactionType === 'venda' ? 8 : 10;
    const displayRate = rate !== null ? rate / 100 : defaultRate;
    const isCustom = rate !== null;
    
    toast.success(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-purple-500 flex-shrink-0" />
          <span className="font-semibold text-purple-700">Comissão Atualizada!</span>
        </div>
        <p className="text-sm text-gray-600">
          Imóvel: <span className="font-medium">"{propertyTitle}"</span>
        </p>
        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
          <span className="text-sm text-purple-600">Nova taxa:</span>
          <span className="font-bold text-purple-700">{displayRate}%</span>
          {isCustom && (
            <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
              Customizada
            </span>
          )}
          {!isCustom && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              Padrão
            </span>
          )}
        </div>
      </div>,
      {
        duration: 5000,
        className: "border-l-4 border-l-purple-500",
      }
    );
  },

  // Toast para criação de propriedade
  propertyCreated: (title: string, needsApproval: boolean = false) => {
    if (needsApproval) {
      toast.info(
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <span className="font-semibold text-yellow-700">Imóvel Cadastrado!</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">"{title}"</span> foi cadastrado e está{" "}
            <span className="font-medium text-yellow-600">aguardando aprovação</span> do administrador.
          </p>
        </div>,
        {
          duration: 5000,
          className: "border-l-4 border-l-yellow-500",
        }
      );
    } else {
      toast.success(
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <span className="font-semibold text-green-700">Imóvel Cadastrado!</span>
          </div>
          <p className="text-sm text-gray-600">
            <span className="font-medium">"{title}"</span> foi cadastrado com sucesso.
          </p>
        </div>,
        {
          duration: 4000,
          className: "border-l-4 border-l-green-500",
        }
      );
    }
  },

  // Toast para imóvel aprovado
  propertyApproved: (title: string) => {
    toast.success(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <span className="font-semibold text-green-700">Imóvel Aprovado!</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">"{title}"</span> foi aprovado e está disponível para o público.
        </p>
      </div>,
      {
        duration: 4000,
        className: "border-l-4 border-l-green-500",
      }
    );
  },

  // Toast para imóvel rejeitado
  propertyRejected: (title: string, reason: string) => {
    toast.error(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="font-semibold text-red-700">Imóvel Rejeitado</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">"{title}"</span> foi rejeitado.
        </p>
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
          Motivo: {reason}
        </p>
      </div>,
      {
        duration: 6000,
        className: "border-l-4 border-l-red-500",
      }
    );
  },

  // Toast para atualização de propriedade
  propertyUpdated: (title: string) => {
    toast.success(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <span className="font-semibold text-blue-700">Imóvel Atualizado!</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">"{title}"</span> foi atualizado com sucesso.
        </p>
      </div>,
      {
        duration: 4000,
        className: "border-l-4 border-l-blue-500",
      }
    );
  },

  // Toast para exclusão
  deleted: (itemName: string, itemType: string = "Item") => {
    toast.success(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="font-semibold text-red-700">{itemType} Excluído</span>
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">"{itemName}"</span> foi excluído com sucesso.
        </p>
      </div>,
      {
        duration: 4000,
        className: "border-l-4 border-l-red-500",
      }
    );
  },

  // Toast para status de comissão
  commissionStatusChanged: (status: string, propertyTitle: string) => {
    const statusConfig = {
      paga: { color: 'green', label: 'Comissão Paga' },
      pendente: { color: 'yellow', label: 'Comissão Pendente' },
      cancelada: { color: 'red', label: 'Comissão Cancelada' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    
    toast.success(
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`h-5 w-5 text-${config.color}-500 flex-shrink-0`} />
          <span className={`font-semibold text-${config.color}-700`}>{config.label}</span>
        </div>
        <p className="text-sm text-gray-600">
          Imóvel: <span className="font-medium">"{propertyTitle}"</span>
        </p>
      </div>,
      {
        duration: 4000,
        className: `border-l-4 border-l-${config.color}-500`,
      }
    );
  },

  // Fechar todos os toasts
  dismiss: () => {
    toast.dismiss();
  },
};

export default systemToast;
