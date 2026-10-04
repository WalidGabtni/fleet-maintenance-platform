import Image from "next/image";

export function AuthHeroPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-brand-bg">
      <Image
        src="/truck-hero.png"
        alt="Camion Fleet Data au crépuscule"
        fill
        preload
        sizes="100vw"
        className="object-cover object-[68%_center] md:object-center"
        style={{ animation: "ken-burns 13s ease-in-out infinite alternate" }}
      />
      {/* Warm sunset glow, bottom-left */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(65% 65% at 14% 92%, oklch(0.75 0.15 55 / 0.85) 0%, oklch(0.65 0.2 35 / 0.4) 32%, transparent 68%)",
          mixBlendMode: "screen",
          animation: "sun-flicker 7s ease-in-out infinite",
        }}
      />
      {/* Dark vignette so the centered card stays legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, oklch(0.165 0.014 45 / 0.5) 0%, oklch(0.165 0.014 45 / 0.78) 65%, oklch(0.125 0.012 45 / 0.94) 100%)",
        }}
      />
      {/* Drifting embers */}
      <div
        className="absolute inset-0 opacity-45"
        style={{
          mixBlendMode: "screen",
          backgroundImage:
            "radial-gradient(oklch(0.68 0.2 35 / 0.6) 1px, transparent 1.5px), radial-gradient(oklch(0.64 0.19 27 / 0.45) 1px, transparent 1.5px)",
          backgroundSize: "140px 140px, 90px 90px",
          backgroundPosition: "0 0, 40px 60px",
          animation: "ember-drift 7s linear infinite",
        }}
      />
      <div
        className="relative z-10 flex w-full flex-col items-center px-4 py-12"
        style={{ animation: "fade-in-up 700ms ease-out" }}
      >
        {children}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 border-t border-brand-border/50 bg-brand-bg-inset/80 px-4 py-2 text-center text-xs text-brand-fg-muted backdrop-blur-sm">
        <span className="rounded-full bg-accent-500/15 px-2 py-0.5 font-semibold text-accent-400">BÊTA</span>
        Cette application est en développement actif — des changements peuvent survenir.
      </div>
    </div>
  );
}
