// Wordmark vetorial construído a partir do logotipo original (monograma "B", traços de velocidade,
// avião e "BELOTI — TRAVEL —"). Substituir pelo vetor oficial quando disponível (docs/MEDIA.md).
type Props = { className?: string; tone?: "light" | "dark"; compact?: boolean };

export function Logo({ className, tone = "light", compact }: Props) {
  const fg = tone === "light" ? "#F8F7F3" : "#08273B";
  return (
    <svg viewBox="0 0 220 64" className={className} aria-hidden="true">
      <g fill="none" stroke="#D6B47A" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 20h17M10 26h13M14 32h9" />
      </g>
      <text x="26" y="40" fontFamily="var(--font-display)" fontSize="38" fontWeight="600" fill={fg}>B</text>
      <path d="M40 9c-2 6-2 18 0 34" stroke={fg} strokeWidth="1.4" fill="none" opacity="0.55" />
      {!compact && (
        <>
          <text x="62" y="31" fontFamily="var(--font-sans)" fontSize="19" fontWeight="700" letterSpacing="6.2" fill={fg}>BELOTI</text>
          <path d="M64 45h12M168 45h12" stroke="#D6B47A" strokeWidth="1.6" />
          <text x="82" y="50" fontFamily="var(--font-sans)" fontSize="12.5" fontWeight="600" letterSpacing="6" fill={fg}>TRAVEL</text>
          <path d="M187 13l13-4.5-2.6 2.4 6.4 1.8-1.4 1.4-6.8-0.6-3.6 3.4-1.8 0.1 1.8-3.8-4.6-0.4z" fill={fg} opacity="0.7" />
        </>
      )}
    </svg>
  );
}
