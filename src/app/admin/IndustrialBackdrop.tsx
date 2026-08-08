import { TechnicalReticle } from '../TechnicalReticle'

// Purely decorative, aria-hidden — /admin-only companion to OrbitalBackdrop
// (which stays shared with the front door and is left untouched). Renders
// the shared TechnicalReticle at its original size/opacity/color, so this
// stays a pure extraction with no visual change at /admin — the front door
// now also uses TechnicalReticle directly, with its own restrained tuning.
export function IndustrialBackdrop() {
  return <TechnicalReticle />
}
