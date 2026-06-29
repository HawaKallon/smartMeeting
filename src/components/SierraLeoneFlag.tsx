export function SierraLeoneFlag({
  className = "",
  label = "Sierra Leone flag",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex overflow-hidden rounded-md border border-[#d8e1ee] bg-white shadow-sm ${className}`}
      aria-label={label}
    >
      <span className="flex-1 bg-[#007236]" />
      <span className="flex-1 bg-white" />
      <span className="flex-1 bg-[#003580]" />
    </span>
  );
}
