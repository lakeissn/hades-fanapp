import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function createUnifiedIconImage(canvasSize: number, logoSize: number) {
  const logo = await readFile(join(process.cwd(), "public", "icons", "hades_helper.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
        }}
      >
        <img src={src} width={logoSize} height={logoSize} alt="Hades helper" />
      </div>
    ),
    {
      width: canvasSize,
      height: canvasSize,
    }
  );
}
