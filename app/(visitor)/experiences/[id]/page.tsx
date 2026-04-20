type Params = { params: { id: string } };

export default function ExperienceDetailPage({ params }: Params) {
  return (
    <main className="container py-10">
      <h2 className="text-xl font-semibold">체험 상세 #{params.id}</h2>
      <p className="mt-2 text-sm text-neutral-600">
        Week 3 구현: AI 코스 제안 · 지도 · 날씨 위젯 · 예약 CTA.
      </p>
    </main>
  );
}
