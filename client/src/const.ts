export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "Administrador de Propriedades";

// Authentication uses the local username/password login in all environments.
export const getLoginUrl = () => "/login";
