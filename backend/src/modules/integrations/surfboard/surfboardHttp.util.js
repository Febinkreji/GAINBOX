import { surfboardConfig } from '../../../config/surfboard.config.js'

/**
 * Developer utilities: URL building and header generation, shared by
 * surfboard.client.js so every adapter builds requests identically. Every
 * future Surfboard adapter should build its requests through
 * surfboard.client.js — not by importing these directly — but they're
 * exported for that one caller and for tests.
 */

/**
 * Joins the configured base URL and a path into one URL, tolerating a
 * leading/trailing slash either way so callers never have to think about
 * it (e.g. buildSurfboardUrl('/merchants') and buildSurfboardUrl('merchants')
 * produce the same result).
 *
 * Deliberately no API-version segment — confirmed against the real
 * Developer Portal (Merchant Creation, Merchant Functions, Multi Merchant
 * Group, Client Auth Token all shown as `/api/partners/{partnerId}/...`,
 * never `/api/v1/partners/...`). Sprint 1's version-segment assumption was
 * unconfirmed and is now known wrong; removed rather than left in place.
 */
export function buildSurfboardUrl(path) {
  const base = surfboardConfig.baseUrl.replace(/\/+$/, '')
  const cleanPath = String(path).replace(/^\/+/, '')

  return `${base}/${cleanPath}`
}

/**
 * Common headers for every Surfboard request. `API-KEY`/`API-SECRET` are
 * confirmed exactly as shown in the Developer Portal's Headers tab for
 * Merchant Creation — static partner credentials, not a Bearer token (see
 * surfboard.config.js's docstring for why Sprint 1's OAuth assumption was
 * replaced). `Accept` and the `X-Request-Id`/`X-Correlation-Id` tracing
 * headers weren't shown in that example, but they're ours to add — they
 * only help our own logs (see surfboardLogging.util.js) and cost nothing
 * if Surfboard ignores them, unlike guessing at a *required* field would.
 */
export function buildSurfboardHeaders({ requestId, correlationId }) {
  return {
    'API-KEY': surfboardConfig.apiKey,
    'API-SECRET': surfboardConfig.apiSecret,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
  }
}

/**
 * Only used by surfboardAuth.service.js, which no longer applies to any
 * confirmed partner/admin endpoint (see that file's own updated docstring)
 * — kept in case a future, structurally different integration (the
 * portal's separate "Client Auth Token" flow, for customer-facing tokens)
 * ends up needing an unauthenticated token-request header shape.
 */
export function buildSurfboardAuthHeaders({ requestId }) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Request-Id': requestId,
  }
}

/**
 * Surfboard responses are expected to be JSON, but a body-less 204 or an
 * unexpected plain-text error page shouldn't crash the client — parse
 * defensively and fall back to the raw text rather than throwing a
 * SyntaxError that would mask the real HTTP status.
 */
export function parseSurfboardResponseBody(text) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}
