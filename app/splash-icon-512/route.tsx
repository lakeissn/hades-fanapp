// app/splash-icon-512/route.ts
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * WebAPK 스플래시 전용 아이콘
 * - 512x512 캔버스, 불투명 #000000 배경
 * - 로고를 캔버스의 ~75%로 크게 배치
 * - 투명 배경이 아니므로 흰 프레이밍/박스가 생기지 않음
 */
export async function GET() {
  const logo = await readFile(
    join(process.cwd(), "public", "icons", "splash_logo.png")
  );
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
          // ★ 핵심: 불투명 검정 배경 (투명 X)
          background: "#000000",
        }}
      >
        <img
          src={src}
          width={384}   // 512 × 0.75 = 384
          height={384}
          alt=""
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
