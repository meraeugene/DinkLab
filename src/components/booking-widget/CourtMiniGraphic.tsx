

export function CourtMiniGraphic() {
  return (
    <span
      aria-hidden="true"
      className="h-28 w-28 shrink-0 rounded-xl border border-white/20 bg-black bg-cover bg-center shadow-[0_0_18px_rgba(255,255,255,0.12)] sm:h-32 sm:w-32"
      style={{ backgroundImage: "url(/court-selection.png)" }}
    >
      <span className="sr-only">Dink Lab court</span>
    </span>
  );
}
