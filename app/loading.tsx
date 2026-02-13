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
        src="/icons/splash_logo.png"
        alt=""
        aria-hidden="true"
        style={{
          width: "70vw",
          maxWidth: 320,
          maxHeight: "40vh",
          height: "auto",
          objectFit: "contain",
          display: "block",
        }}
      />
    </main>
  );
}
