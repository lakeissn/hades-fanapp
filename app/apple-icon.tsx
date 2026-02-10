import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 130,
            height: 130,
            borderRadius: 36,
            background: "linear-gradient(135deg,#ff6adf,#ff5fa2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#17081f",
            fontSize: 76,
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
