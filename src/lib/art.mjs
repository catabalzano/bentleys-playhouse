// Custom illustrations (inline SVG, colors from CSS tokens so both themes work).
import { asset } from './core.mjs';

export function heroDoorway() {
  return `<svg class="hero-art" viewBox="0 0 1200 520" role="img" aria-labelledby="hero-art-t" preserveAspectRatio="xMidYMid slice">
  <title id="hero-art-t">Illustration: Bentley, our French Bulldog, peeking through the glowing doorway of a playhouse.</title>
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--gold)"/><stop offset="1" stop-color="var(--orange)"/></linearGradient>
    <pattern id="stripes" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="var(--hero-wall)"/><rect width="10" height="34" fill="var(--hero-stripe)"/></pattern>
    <clipPath id="door-clip"><path d="M484 440V262a116 116 0 0 1 232 0v178z"/></clipPath>
  </defs>
  <rect width="1200" height="520" fill="url(#stripes)"/>
  <rect y="430" width="1200" height="90" fill="var(--hero-floor)"/>
  <rect y="424" width="1200" height="10" rx="4" fill="var(--hero-trim)"/>
  <!-- window -->
  <g class="hero-art__window">
    <rect x="128" y="150" width="200" height="190" rx="96" fill="var(--blue)"/>
    <rect x="146" y="168" width="164" height="154" rx="80" fill="var(--hero-sky)"/>
    <path d="M228 168v154M146 252h164" stroke="var(--blue)" stroke-width="10"/>
    <circle cx="280" cy="210" r="18" fill="var(--gold)" opacity=".9"/>
    <rect x="118" y="336" width="220" height="16" rx="8" fill="var(--hero-trim)"/>
    <path d="M196 336c-8-26 4-44 22-50-4 18 0 34-4 50zM214 336c6-30 26-42 44-40-12 14-18 30-22 40z" fill="var(--violet)"/>
    <rect x="190" y="318" width="52" height="22" rx="8" fill="var(--orange)"/>
  </g>
  <!-- doorway -->
  <path d="M450 440V262a150 150 0 0 1 300 0v178z" fill="var(--blue)"/>
  <path d="M484 440V262a116 116 0 0 1 232 0v178z" fill="url(#glow)"/>
  <g clip-path="url(#door-clip)">
    <ellipse cx="600" cy="452" rx="150" ry="40" fill="var(--orange)" opacity=".55"/>
    <image class="hero-art__bentley" href="${asset('img/bentley-head.png')}" x="520" y="268" width="160" height="185"/>
  </g>
  <circle cx="600" cy="132" r="22" fill="var(--gold)" stroke="var(--hero-trim)" stroke-width="6"/>
  <circle cx="600" cy="124" r="4" fill="var(--hero-trim)"/>
  <!-- mat -->
  <rect x="510" y="446" width="180" height="34" rx="17" fill="var(--violet)"/>
  <text x="600" y="469" text-anchor="middle" font-family="Fredoka, 'Arial Rounded MT Bold', sans-serif" font-weight="600" font-size="17" letter-spacing="5" fill="var(--hero-wall)">WELCOME</text>
  <!-- hooks + leash -->
  <g class="hero-art__hooks">
    <rect x="850" y="196" width="190" height="16" rx="8" fill="var(--hero-trim)"/>
    <circle cx="890" cy="222" r="7" fill="var(--blue)"/><circle cx="950" cy="222" r="7" fill="var(--blue)"/><circle cx="1010" cy="222" r="7" fill="var(--blue)"/>
    <path d="M890 228c-10 50 18 86 4 130" fill="none" stroke="var(--orange)" stroke-width="9" stroke-linecap="round"/>
    <rect x="880" y="352" width="30" height="20" rx="8" fill="var(--orange)"/>
    <path d="M950 228c0 24 0 30 0 34" stroke="var(--violet)" stroke-width="6"/>
    <circle cx="950" cy="290" r="28" fill="none" stroke="var(--violet)" stroke-width="10"/>
    <circle cx="950" cy="322" r="11" fill="var(--gold)"/>
  </g>
  <!-- ball + bed -->
  <circle cx="1010" cy="408" r="26" fill="var(--orange)"/>
  <path d="M988 396c14 10 30 10 44 0M988 420c14-10 30-10 44 0" fill="none" stroke="var(--hero-wall)" stroke-width="4"/>
  <ellipse cx="250" cy="438" rx="120" ry="30" fill="var(--violet)"/>
  <ellipse cx="250" cy="430" rx="92" ry="18" fill="var(--peach)"/>
</svg>`;
}

/** Small arch frame placeholder for photos we don't have yet. */
export function photoSlot(label, variant = 'blue') {
  return `<div class="photo-slot photo-slot--${variant}" role="img" aria-label="${label}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="9.5" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg>
    <span>${label}</span>
  </div>`;
}
