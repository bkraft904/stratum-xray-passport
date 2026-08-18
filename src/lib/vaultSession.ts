const SESSION_KEY = 'stratum-vault-session'
const EMAIL_KEY = 'stratum-vault-email'

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function getSessionEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY)
}

export function setSession(token: string, email: string) {
  localStorage.setItem(SESSION_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

export function isSignedIn(): boolean {
  return getSession() !== null
}
