import { createUnifiedIconImage } from "./_iconTemplate";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  return createUnifiedIconImage(220 220);
}
