import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  backUrl?: string;
  backLabel?: string;
  children?: React.ReactNode;
}

/**
 * Componente de cabeçalho de página reutilizável
 * Elimina duplicação de código entre páginas
 */
export function PageHeader({ 
  title, 
  backUrl = "/", 
  backLabel = "Voltar",
  children 
}: PageHeaderProps) {
  return (
    <div className="bg-white shadow">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href={backUrl}>
            <Button variant="ghost" size="sm" aria-label={backLabel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
        </div>
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
