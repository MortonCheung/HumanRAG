export function RecommendationReason({ reason }: { reason: string }) {
  return (
    <div className="teach-home__reason" id="teaching-reason">
      <span aria-hidden>▸</span>
      <span>{reason}</span>
    </div>
  );
}
