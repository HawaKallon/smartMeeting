export function CoatOfArmsPlaceholder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-[1.75rem] border border-dashed border-[#d8e1ee] bg-white/70 p-6 text-center ${className}`}
    >
      <div>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#fab700] bg-[#f7fbff] text-xs font-bold uppercase tracking-[0.2em] text-[#003580]">
          Coat
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#007236]">
          Coat of Arms Placeholder
        </p>
      </div>
    </div>
  );
}
