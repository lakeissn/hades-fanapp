import type { MetadataRoute } from "next";
 
 export default function manifest(): MetadataRoute.Manifest {
   return {
     name: "HADES INFO",
     short_name: "HADES INFO",
     description: "하데스 팬앱",
     start_url: "/",
     display: "standalone",
     background_color: "#0a0a0a",
     theme_color: "#0a0a0a",
     icons: [
       {
        src: "/icon",
         sizes: "192x192",
         type: "image/png",
         purpose: "any",
       },
       {
        src: "/icon",
         sizes: "512x512",
         type: "image/png",
         purpose: "any",
       },
       {
        src: "/apple-icon",
         sizes: "180x180",
         type: "image/png",
         purpose: "any",
       },
       /* (FIX #5) maskable 아이콘 별도 제공 → Android에서 적응형 아이콘으로 표시 */
       {
        src: "/icon",
         sizes: "512x512",
         type: "image/png",
         purpose: "maskable",
       },
     ],
   };
 }
