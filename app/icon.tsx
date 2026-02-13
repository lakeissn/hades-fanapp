diff --git a/app/icon.tsx b/app/icon.tsx
index ed111078f6125d54cbb3cd6e97d5ed4ede67734c..b684a654ec2f81a65c91e420f0898b800126e9ff 100644
--- a/app/icon.tsx
+++ b/app/icon.tsx
@@ -5,31 +5,31 @@ import { join } from "node:path";
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
           background: "#0a0a0a",
           borderRadius: "90px",
         }}
       >
         {/* (FIX #5) 로고 크기 키움: 470→400 (여백 확보하여 모든 디바이스에서 예쁘게) */}
-        <img src={src} width={400} height={400} alt="Hades helper" />
+        <img src={src} width={370} height={370} alt="Hades helper" />
       </div>
     ),
     size
   );
 }
