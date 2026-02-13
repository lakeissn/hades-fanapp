import { createUnifiedIconImage } from "./_iconTemplate";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default async function Icon() {
  return createUnifiedIconImage(550, 550);
}
