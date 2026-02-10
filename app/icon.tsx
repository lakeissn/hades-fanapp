import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <div
          style={{
            width: 330,
            height: 330,
            borderRadius: 96,
            background: "linear-gradient(135deg,#ff6adf,#ff5fa2)",
            boxShadow: "0 20px 56px rgba(255,90,178,0.38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#17081f",
            fontSize: 190,
            fontWeight: 800,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            fontFamily: "Arial",
          }}
        >
          H
        </div>
      </div>
    ),
    size
  );
}
