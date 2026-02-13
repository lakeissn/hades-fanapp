export const size = {
   width: 180,
   height: 180,
 };
 
 export const contentType = "image/png";
 
 export default async function AppleIcon() {
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
         }}
       >
         {/* (FIX #5) 로고 크기 키움: 148→140 (180px 안에서 적절한 여백) */}
          <img src={src} width={140} height={140} alt="Hades helper" />
       </div>
     ),
     size
   );
 }
