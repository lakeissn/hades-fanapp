/**
 * firebase/admin.ts
 * 서버 사이드 Firebase Admin SDK 초기화
 * - FCM 메시지 발송에 사용
 */
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON || "{}";
  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const messaging = admin.messaging();
export default admin;
