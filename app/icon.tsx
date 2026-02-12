import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default async function Icon() {
  const png = await readFile(join(process.cwd(), "public", "icons", "hades_helper.png"));
  const src = `data:image/png;base64,${png.toString("base64")}`;

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
        <img src={src} width={470} height={470} alt="Hades helper" />
      </div>
    ),
    size
  );
}
