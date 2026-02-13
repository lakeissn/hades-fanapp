export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      <img
        src="/icons/hades_helper.png"
        alt="HADES INFO"
        width={92}
        height={92}
        style={{ borderRadius: 14 }}
      />
    </main>
  );
}
