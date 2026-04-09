// Jamendo configuration
export const JAMENDO_CLIENT_ID: string = (import.meta.env.VITE_JAMENDO_CLIENT_ID || "").trim();
export const JAMENDO_API_BASE_URL = "https://api.jamendo.com/v3.0";

export const ENABLE_OFFLINE_CACHE = import.meta.env.VITE_ENABLE_OFFLINE_CACHE === "true";
export const API_RETRY_ENABLED = import.meta.env.VITE_API_RETRY_ENABLED === "true";

export const THROTTLE_DELAY = 150;