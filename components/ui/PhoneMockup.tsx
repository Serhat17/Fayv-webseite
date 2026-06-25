"use client";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface PhoneMockupProps {
  className?: string;
  children?: React.ReactNode;
}

export function PhoneMockup({ className, children }: PhoneMockupProps) {
  return (
    <div className={cn("relative mx-auto", className)}>
      {/* Phone frame */}
      <div className="relative mx-auto w-[280px] h-[580px] rounded-[3rem] border-[6px] border-[#2a2a2a] bg-black shadow-2xl shadow-black/50 overflow-hidden">
        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-20" />

        {/* Screen */}
        <div className="relative w-full h-full overflow-hidden rounded-[2.4rem] bg-gradient-to-b from-[#0a0a0a] to-[#111]">
          {children || <PhoneMockupContent />}
        </div>

        {/* Glass reflection */}
        <div className="absolute inset-0 rounded-[2.4rem] bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Glow effect behind phone */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
        <div className="absolute inset-8 bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-full" />
      </div>
    </div>
  );
}

function PhoneMockupContent() {
  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-8 pt-14 pb-2">
        <span className="text-[10px] text-white/60 font-medium">9:41</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-sm bg-white/40" />
          <div className="w-2.5 h-2 rounded-sm bg-white/40" />
          <div className="w-5 h-2.5 rounded-full border border-white/40 relative">
            <div className="absolute inset-0.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      {/* App Content */}
      <div className="flex-1 px-4 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[8px] text-white/60 uppercase tracking-widest font-medium">Today&apos;s Outfit</p>
            <p className="text-[14px] text-white font-bold mt-0.5">Good Morning ✨</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-white/10" />
        </div>

        {/* Weather card */}
        <div className="bg-white/5 rounded-2xl p-3 mb-3 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">☀️</span>
              <div>
                <p className="text-[10px] text-white/80 font-medium">22°C · Sunny</p>
                <p className="text-[8px] text-white/40">Perfect for light layers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Outfit suggestion card */}
        <div className="bg-white/5 rounded-2xl p-3 border border-white/10 mb-3">
          <p className="text-[8px] text-white/60 uppercase tracking-wider font-semibold mb-2">AI Suggestion</p>
          <div className="grid grid-cols-3 gap-2">
            {["👕", "👖", "👟"].map((emoji, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg"
              >
                {emoji}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-white/10">
              <div className="h-full w-[85%] rounded-full bg-accent" />
            </div>
            <span className="text-[8px] text-white/60 font-medium">85% Match</span>
          </div>
        </div>

        {/* Community preview */}
        <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
          <p className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">Community</p>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-1 aspect-[3/4] rounded-xl bg-gradient-to-b from-white/5 to-white/[0.02] border border-white/10"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-around px-4 py-3 border-t border-white/10 bg-black/50 backdrop-blur-sm">
        {["🏠", "👔", "📷", "💬", "👤"].map((icon, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col items-center gap-0.5",
              i === 0 ? "opacity-100" : "opacity-40"
            )}
          >
            <span className="text-xs">{icon}</span>
            {i === 0 && (
              <div className="w-1 h-1 rounded-full bg-accent" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


