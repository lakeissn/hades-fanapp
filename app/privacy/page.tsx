"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const sections = [
  {
    title: "개인정보의 수집·이용",
    content:
      "본 서비스는 별도의 회원가입 기능이 없을 수 있으나, 푸시 알림 제공을 위해 기기에서 생성되는 식별자 성격의 정보(예: 푸시 토큰)가 처리될 수 있습니다. 사용자가 직접 입력하는 이름/전화번호 등은 원칙적으로 수집하지 않습니다. (단, 문의 접수 시 이메일 등 사용자가 제공한 정보는 처리될 수 있습니다.)",
  },
  {
    title: "서비스 이용 과정에서 자동 생성·수집될 수 있는 정보",
    items: [
      "접속 로그(IP 주소, 브라우저/기기 정보, 접속 일시, 요청 URL 등)",
      "오류/성능 관련 로그(서비스 안정화 및 보안 목적)",
    ],
    content:
      "위 정보는 서비스 제공, 보안 유지, 비정상 접근 방지 및 오류 개선을 위해 자동으로 생성·수집될 수 있습니다.",
  },
  {
    title: "푸시 알림 서비스 제공을 위한 처리(FCM)",
    content:
      "본 서비스는 푸시 알림 제공을 위해 Firebase Cloud Messaging(FCM)을 사용할 수 있습니다. 사용자가 알림 수신을 허용하는 경우, 서비스는 사용자의 기기(브라우저)에서 FCM 푸시 토큰(알림 전송을 위한 식별자)을 발급받아 처리할 수 있습니다.",
    items: [
      "처리 항목: FCM 푸시 토큰, 알림 설정 정보(수신 여부/관심 항목 등), 기기/브라우저 관련 정보(알림 전송 및 호환성 확인 목적)",
      "처리 목적: 푸시 알림 전송, 중복 발송 방지, 알림 설정 저장 및 서비스 운영",
    ],
  },
  {
    title: "푸시 알림 처리 흐름",
    items: [
      "사용자가 알림 수신을 허용하면, 브라우저가 FCM 푸시 토큰을 발급받습니다.",
      "발급된 푸시 토큰 및 알림 설정 정보는 알림 발송 및 관리 목적을 위해 서버(데이터베이스)에 저장될 수 있습니다.",
      "알림 발송 시 서버는 저장된 푸시 토큰을 이용해 FCM을 통해 알림을 전송합니다.",
    ],
  },
  {
    title: "Supabase를 통한 데이터 처리",
    content:
      "본 서비스는 알림 발송 및 설정 관리를 위해 Supabase(데이터베이스/서버 기능)를 사용할 수 있습니다.",
    items: [
      "처리 항목: FCM 푸시 토큰, 알림 설정 값, 알림 발송 이력(필요 시 최소 범위), 서비스 운영 로그(필요 시)",
      "처리 목적: 푸시 알림 발송 대상 관리, 설정 동기화, 중복 발송 방지 및 운영/보안",
    ],
  },
  {
    title: "기기 내 저장 정보 (Local Storage / IndexedDB 등)",
    content:
      "서비스 편의 제공을 위해 아래 정보가 사용자의 기기(브라우저) 저장소에 저장될 수 있습니다.",
    items: [
      "알림 수신 설정 여부(ON/OFF 상태) 및 관심 항목",
      "중복 알림 방지 및 상태 추적을 위한 최근 처리 값",
      "푸시 토큰 캐시/등록 상태(환경에 따라 저장될 수 있음)",
    ],
  },
  {
    title: "처리 목적",
    items: [
      "서비스의 기본 기능 제공(푸시 알림 포함) 및 안정적 운영",
      "보안 유지, 비정상적인 접근 방지 및 오류 개선",
      "알림 설정 관리 및 중복 발송 방지",
    ],
  },
  {
    title: "보유 및 이용기간",
    content:
      "푸시 토큰 및 알림 설정 정보는 사용자가 알림 수신을 철회하거나 서비스 이용을 중단하는 경우, 또는 보유 목적 달성 시 지체 없이 삭제합니다. 접속 로그 등은 호스팅/인프라 제공자의 운영·보안 정책에 따라 일정 기간 보관될 수 있습니다.",
  },
  {
    title: "처리위탁 및 제3자 제공(알림 전송/인프라)",
    content:
      "본 서비스는 원활한 제공을 위해 아래와 같이 외부 서비스(수탁자)를 이용할 수 있습니다.",
    items: [
      "수탁자: Google LLC (Firebase Cloud Messaging)",
      "위탁 업무: 푸시 알림 전송 인프라 제공",
      "수탁자: Supabase Inc.",
      "위탁 업무: 데이터베이스/서버 기능 제공(알림 토큰 및 설정 관리 등)",
      "수탁자: Vercel Inc.",
      "위탁 업무: 서비스 호스팅 및 클라우드 인프라 운영",
    ],
  },
  {
    title: "국외 이전(해외 사업자/해외 리전 사용 시)",
    content:
      "Firebase(FCM) 및 Supabase, Vercel은 국외에 서버가 위치하거나 국외 사업자가 제공하는 서비스일 수 있습니다. 서비스 운영 환경(리전/저장 위치)에 따라 개인정보가 국외로 이전될 수 있으며, 이 경우 관련 법령에 따라 이전 항목, 이전 국가, 이전 일시 및 방법 등을 고지합니다.",
  },
  {
    title: "이용자의 권리 및 알림 철회 방법",
    items: [
      "사용자는 브라우저/기기 설정에서 알림 허용을 언제든지 변경(차단/허용)할 수 있습니다.",
      "서비스 내 알림 설정에서 수신 대상(관심 항목 등)을 변경하거나 해지할 수 있습니다.",
      "알림 수신 철회 시, 서버에 저장된 푸시 토큰은 삭제 처리될 수 있습니다.",
    ],
  },
  {
    title: "이용자의 권리 및 문의처",
    content:
      "개인정보 관련 문의 또는 의견이 있으신 경우 아래 연락처로 문의해 주시기 바랍니다.",
    items: ["이메일: (운영자 이메일 기재)"],
  },
  {
    title: "고지의 의무",
    content:
      "본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 내용의 추가·삭제 및 수정이 있을 시에는 변경 사항을 서비스 내 공지사항 등을 통해 안내합니다.",
  },
];

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main className="privacy-page">
      <button type="button" className="privacy-back" onClick={() => router.back()}>
        <ChevronLeft size={18} />
        뒤로가기
      </button>

      <div className="privacy-hero">
        <h1 className="privacy-title">개인정보처리방침</h1>
        <p className="privacy-subtitle">
          HADES INFO 서비스의 개인정보 처리에 관한 정책입니다.
        </p>
      </div>

      <div className="privacy-list">
        {sections.map((s, i) => (
          <div key={i} className="privacy-card">
            <div className="privacy-card-head">
              <span className="privacy-num">{i + 1}</span>
              <h3>{s.title}</h3>
            </div>
            {s.content && <p>{s.content}</p>}
            {s.items && (
              <ul>
                {s.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="privacy-effective">
        부칙: 본 방침은 2026년 2월 12일부터 시행됩니다.
      </p>
    </main>
  );
}
