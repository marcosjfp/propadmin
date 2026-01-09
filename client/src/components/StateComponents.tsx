import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Componente para exibir estado de erro com opção de retry
 */
export function ErrorState({ 
  message = "Ocorreu um erro ao carregar os dados", 
  onRetry 
}: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="font-semibold text-red-700">Erro</h3>
          <p className="text-sm text-red-600 mt-1">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface LoadingStateProps {
  message?: string;
}

/**
 * Componente para exibir estado de carregamento
 */
export function LoadingState({ message = "Carregando..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * Componente para exibir estado vazio
 */
export function EmptyState({ 
  title = "Nenhum item encontrado",
  message,
  icon,
  action
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        {icon && <div className="text-gray-400">{icon}</div>}
        <div className="text-center">
          <h3 className="font-semibold text-gray-700">{title}</h3>
          {message && <p className="text-sm text-gray-500 mt-1">{message}</p>}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

/**
 * Componente de Skeleton para loading
 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          {Array.from({ length: lines - 1 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
          ))}
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid de skeleton cards
 */
export function SkeletonGrid({ count = 3, lines = 3 }: { count?: number; lines?: number }) {
  return (
    <div className="grid gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={lines} />
      ))}
    </div>
  );
}

export default { ErrorState, LoadingState, EmptyState, SkeletonCard, SkeletonGrid };
