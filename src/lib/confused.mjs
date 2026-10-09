// "Confused Bentley" for the 404 page: Bentley sitting with his head tilted (his real head illustration
// on a body made with Nano Banana, slimmed and cleaned up Oct 9), plus three floating question marks.
import { asset } from './core.mjs';

export function confusedBentley({ cls = 'nf-art' } = {}) {
  return `<svg class="${cls}" viewBox="0 0 560 640" role="img" aria-label="Bentley, sitting with his head tilted, looking confused">
  <image href="${asset('img/bentley-confused.png')}" x="106" y="34" width="347" height="600"/>
  <g font-family="Fredoka, 'Arial Rounded MT Bold', sans-serif" font-weight="700" text-anchor="middle">
    <text x="62" y="170" font-size="112" fill="#5271FF" transform="rotate(-16 62 130)">?</text>
    <text x="490" y="140" font-size="160" fill="#FF914D" transform="rotate(12 490 90)">?</text>
    <text x="520" y="290" font-size="78" fill="#FFC94D" transform="rotate(20 520 262)">?</text>
  </g>
  <g stroke="#8C52FF" stroke-width="5" stroke-linecap="round"><path d="M404 30l8 18"/><path d="M438 22l-2 20"/><path d="M120 46l10 14"/></g>
</svg>`;
}
