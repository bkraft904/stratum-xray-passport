import type { Frame } from './frameExtractor'
import type { Finding, ImageType } from './analyzeApi'
import { getSession } from './vaultSession'

export const VAULT_API_URL: string | undefined = import.meta.env.VITE_VAULT_API_URL

export function isVaultConfigured(): boolean {
  return typeof VAULT_API_URL === 'string' && VAULT_API_URL.length > 0
}

export interface Property {
  propertyId: string
  address: string
  ownerEmail: string
  shareEnabled: boolean
  createdAt: string
  paid: boolean
  scanCount: number
}

export interface Scan {
  propertyId: string
  scanId: string
  createdAt: string
  imageType: ImageType
  scopeNote: string
  summary: string
  findings: Finding[]
  caveats: string
  model: string
}

export class VaultApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!VAULT_API_URL) {
    throw new Error('VITE_VAULT_API_URL is not configured.')
  }

  const session = getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (session) headers.Authorization = `Bearer ${session}`

  const response = await fetch(`${VAULT_API_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    let code: string | undefined
    try {
      const body = await response.json()
      if (typeof body?.error === 'string') message = body.error
      if (typeof body?.code === 'string') code = body.code
    } catch {
      /* response wasn't JSON — keep the generic message */
    }
    throw new VaultApiError(message, response.status, code)
  }

  return (await response.json()) as T
}

export function requestSignInLink(email: string): Promise<{ message: string }> {
  return request('/auth/request-link', { method: 'POST', body: JSON.stringify({ email }) })
}

export function verifySignInToken(token: string): Promise<{ session: string; email: string }> {
  return request(`/auth/verify?token=${encodeURIComponent(token)}`)
}

export function listProperties(): Promise<{ properties: Property[] }> {
  return request('/properties')
}

export function createProperty(address: string): Promise<Property> {
  return request('/properties', { method: 'POST', body: JSON.stringify({ address }) })
}

export function getProperty(propertyId: string): Promise<{ property: Property; scans: Scan[] }> {
  return request(`/properties/${propertyId}`)
}

export function createVaultScan(propertyId: string, frames: Frame[]): Promise<Scan> {
  return request(`/properties/${propertyId}/scans`, {
    method: 'POST',
    body: JSON.stringify({ images: frames }),
  })
}

export interface PropertyReport {
  report: string
  scanCount: number
  companyName: string
  address: string
}

export function getPropertyReport(propertyId: string): Promise<PropertyReport> {
  return request(`/properties/${propertyId}/report`)
}

export function getAccount(): Promise<{ companyName: string }> {
  return request('/account')
}

export function updateAccount(companyName: string): Promise<{ companyName: string }> {
  return request('/account', { method: 'POST', body: JSON.stringify({ companyName }) })
}

export function askProperty(propertyId: string, question: string): Promise<{ answer: string }> {
  return request(`/properties/${propertyId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}

export function requestOwnershipTransfer(propertyId: string, newOwnerEmail: string): Promise<{ message: string }> {
  return request(`/properties/${propertyId}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ newOwnerEmail }),
  })
}

export function acceptOwnershipTransfer(token: string): Promise<{ session: string; email: string; propertyId: string }> {
  return request(`/transfer/accept?token=${encodeURIComponent(token)}`)
}

export function setPropertyShared(propertyId: string, enabled: boolean): Promise<{ propertyId: string; shareEnabled: boolean }> {
  return request(`/properties/${propertyId}/share`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  })
}

export interface PublicScan {
  scanId: string
  createdAt: string
  imageType: ImageType
  summary: string
  findings: Finding[]
}

export function createCheckoutSession(propertyId: string): Promise<{ url: string }> {
  return request(`/properties/${propertyId}/checkout`, { method: 'POST' })
}

export function getPublicProperty(propertyId: string): Promise<{ address: string; scans: PublicScan[] }> {
  // Public route — deliberately does not attach an Authorization header.
  return fetch(`${VAULT_API_URL}/properties/${propertyId}/public`).then(async (response) => {
    if (!response.ok) throw new VaultApiError('This property record is not shared, or does not exist.', response.status)
    return (await response.json()) as { address: string; scans: PublicScan[] }
  })
}

export type SubscriptionTier = 'solo' | 'crew' | 'company'

export interface Subscription {
  tier: SubscriptionTier
  tierName: string
  status: string
  scansUsedThisPeriod: number
  scanCap: number | null // null means unlimited
  currentPeriodEnd: string | null
}

export function getSubscription(): Promise<{ subscription: Subscription | null }> {
  return request('/subscription')
}

export function createSubscriptionCheckout(tier: SubscriptionTier): Promise<{ url: string }> {
  return request('/subscription/checkout', { method: 'POST', body: JSON.stringify({ tier }) })
}

export function openBillingPortal(): Promise<{ url: string }> {
  return request('/subscription/portal', { method: 'POST' })
}

export interface AdminEvent {
  type: string
  email: string
  createdAt: string
}

export interface AdminStats {
  days: number
  counts: Record<string, number>
  events: AdminEvent[]
}

export function getAdminStats(days = 30): Promise<AdminStats> {
  return request(`/admin/stats?days=${days}`)
}
