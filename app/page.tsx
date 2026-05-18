import Link from "next/link";

export default function RootRedirect() {
  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-6 py-16">
      <h1 className="text-3xl font-bold text-brand">NOSYU</h1>
      <p className="text-neutral-600">충남 하이퍼로컬 관광 MVP · Phase 1 scaffold</p>
      <Link
        href="/onboarding"
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white"
      >
        시작하기
      </Link>
    </main>
  );
}
