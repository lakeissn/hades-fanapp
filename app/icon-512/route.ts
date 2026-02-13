import { createUnifiedIconImage } from "../_iconTemplate";

export async function GET() {
  return createUnifiedIconImage(512, 465);
}
