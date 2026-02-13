import { createUnifiedIconImage } from "../_iconTemplate";

export async function GET() {
  return createUnifiedIconImage(650, 550);
}
