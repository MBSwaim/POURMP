interface LogoProps {
  className?: string
  /** 'gold' for nav/UI (amber tint), 'white' for dark overlays, 'black' for print */
  color?: 'gold' | 'white' | 'black' | 'auto'
}

// CSS filters to colorize the black PNG logo
const FILTERS = {
  gold:  'brightness(0) saturate(100%) invert(65%) sepia(40%) saturate(600%) hue-rotate(5deg) brightness(95%)',
  white: 'brightness(0) invert(1)',
  black: 'brightness(0)',
  auto:  '', // let the parent handle it via className
}

export function Logo({ className = '', color = 'auto' }: LogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Manhattan Project Beer Co."
      className={className}
      style={color !== 'auto' ? { filter: FILTERS[color] } : undefined}
    />
  )
}
