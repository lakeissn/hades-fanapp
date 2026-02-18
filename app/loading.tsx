export default function Loading() {
  // loading.tsx는 route 전환 시 Next.js Suspense fallback으로 사용됨.
  // 테마 배경색과 동일하게 맞춰 전환 시 깜빡임 방지.
  return <main className="loading-fallback" />;
}
