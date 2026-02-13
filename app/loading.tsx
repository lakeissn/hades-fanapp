export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <img
        src="/icons/splash_logo.png"
        alt=""
        aria-hidden="true"
        style={{
          width: "clamp(220px, 72vw, 520px)",
          maxHeight: "42vh",
          height: "auto",
          objectFit: "contain",
          display: "block",
          background: "transparent",
          border: "none",
          boxShadow: "none",
          padding: 0,
          transform: "scale(1.9)",
          transformOrigin: "center",
        }}
      />
    </main>
  );
}
