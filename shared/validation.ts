import { z } from 'zod';
export const idSchema = z.number().int().positive().max(2147483647);
export const passwordSchema = z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(72)
  .regex(/[A-Z]/, 'Senha deve conter uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter um número')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter um caractere especial')
  .refine(value => new TextEncoder().encode(value).length <= 72, 'Senha deve ter no máximo 72 bytes');
export const dateFilterSchema = z.string().max(40).refine(value => /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value.slice(0,10)}T00:00:00Z`).toISOString().slice(0,10) === value.slice(0,10), 'Data inválida');
export const propertyStatuses = ['pendente','ativa','vendida','alugada','inativa','rejeitada'] as const;
export const propertyTypes = ['apartamento','casa','terreno','comercial','outro'] as const;
export const transactionTypes = ['venda','aluguel'] as const;

export const auditActions = ["user_created","user_updated","user_deleted","user_role_changed","user_login","user_logout","property_created","property_updated","property_deleted","property_status_changed","property_sold","property_rented","property_assigned","property_commission_changed","property_approved","property_rejected","image_uploaded","image_deleted","image_primary_changed","commission_created","commission_status_changed","commission_paid","commission_cancelled"] as const;

export const defaultCommissionRates = {venda:800,aluguel:1000} as const;
