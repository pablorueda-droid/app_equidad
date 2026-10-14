// Estado del tour de bienvenida (se guarda en localStorage para no repetirlo)
export const CLAVE_ONBOARDING = 'equidad-onboarding-v1'

export function onboardingVisto() {
  try {
    return localStorage.getItem(CLAVE_ONBOARDING) === '1'
  } catch {
    return false
  }
}
