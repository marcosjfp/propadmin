/**
 * Utilitários de formatação compartilhados
 * Centralizados para evitar duplicação de código
 */

/**
 * Formata um valor em centavos para moeda brasileira (BRL)
 * @param price - Valor em centavos (ex: 100000 = R$ 1.000,00)
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price / 100);
}

/**
 * Formata uma data para o padrão brasileiro
 * @param date - Data a ser formatada
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Formata uma data com hora para o padrão brasileiro
 * @param date - Data a ser formatada
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formata apenas o mês e ano
 * @param date - Data a ser formatada
 */
export function formatMonthYear(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Formata um número de telefone brasileiro
 * @param phone - Telefone sem formatação
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Formata um CEP brasileiro
 * @param cep - CEP sem formatação
 */
export function formatCEP(cep: string | null | undefined): string {
  if (!cep) return "-";
  const cleaned = cep.replace(/\D/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return cep;
}

/**
 * Formata uma porcentagem a partir de centésimos
 * @param rate - Valor em centésimos (ex: 800 = 8%)
 */
export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "-";
  return `${(rate / 100).toFixed(2)}%`;
}

/**
 * Formata área em metros quadrados
 * @param size - Tamanho em m²
 */
export function formatArea(size: number | null | undefined): string {
  if (!size) return "-";
  return `${size.toLocaleString("pt-BR")} m²`;
}

/**
 * Retorna badge de status traduzido
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ativa: "Ativa",
    vendida: "Vendida",
    alugada: "Alugada",
    inativa: "Inativa",
    pendente: "Pendente Aprovação",
    rejeitada: "Rejeitada",
    paga: "Paga",
    cancelada: "Cancelada",
  };
  return labels[status] || status;
}

/**
 * Retorna cor do badge baseado no status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ativa: "bg-green-100 text-green-800",
    vendida: "bg-blue-100 text-blue-800",
    alugada: "bg-purple-100 text-purple-800",
    inativa: "bg-gray-100 text-gray-800",
    pendente: "bg-yellow-100 text-yellow-800",
    rejeitada: "bg-red-100 text-red-800",
    paga: "bg-green-100 text-green-800",
    cancelada: "bg-red-100 text-red-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

/**
 * Trunca texto com ellipsis
 * @param text - Texto a truncar
 * @param maxLength - Comprimento máximo
 */
export function truncate(text: string | null | undefined, maxLength: number = 100): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida formato de telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 11;
}

/**
 * Valida formato de CEP
 */
export function isValidCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, "");
  return cleaned.length === 8;
}
