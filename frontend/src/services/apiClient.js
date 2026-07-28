import axios from 'axios'

/**
 * Shared HTTP client for the GainBox backend only.
 *
 * The frontend never talks to Surfboard directly — per the GainBox system
 * architecture, all Surfboard communication (merchant creation, payments,
 * device management, etc.) is proxied through the GainBox backend, which is
 * the only party holding Surfboard credentials. Every `services/*Service.js`
 * module should call GainBox backend routes through this client; none of
 * them should ever point at a Surfboard host directly.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})
