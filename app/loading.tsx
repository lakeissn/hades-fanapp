export default function Loading() {
  // loading.tsx는 route 전환 시 Next.js Suspense fallback으로 사용됨.
  // 콜드 스타트 스플래시는 layout.tsx의 #__splash가 담당하므로,
  // 여기서는 검정 배경만 유지하여 전환 시 깜빡임을 방지.
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#000",
      }}
    />
  );
}
