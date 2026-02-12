"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">PRIVACY</p>
            <h2>개인정보처리방침</h2>
          </div>
        </div>
      </section>

      <div className="glass" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        <div className="privacy-section">
          <h3>1. 개인정보의 수집·이용</h3>
          <p>본 서비스는 별도의 회원가입 또는 로그인 기능을 제공하지 않으며, 사용자의 개인정보(이름, 이메일, 전화번호 등)를 서버로 수집하거나 저장하지 않습니다.</p>
        </div>

        <div className="privacy-section">
          <h3>2. 서비스 이용 과정에서 생성·처리될 수 있는 정보</h3>
          <p>서비스 제공 및 접속 과정에서 자동으로 생성되는 접속 로그(IP 주소, 브라우저/기기 정보, 접속 일시, 요청 URL 등)는 호스팅 서비스 및 보안 유지를 위해 일시적으로 처리될 수 있습니다.</p>
        </div>

        <div className="privacy-section">
          <h3>3. 알림 서비스 및 로컬 데이터 처리</h3>
          <p>본 서비스는 별도의 발송 서버(FCM 등)를 사용하지 않고, 사용자의 기기(브라우저)가 공개된 정보를 주기적으로 확인하여 알림을 생성하는 방식을 사용합니다.</p>
        </div>

        <div className="privacy-section">
          <h3>3-1. 알림 작동 방식</h3>
          <ul>
            <li>사용자의 브라우저가 주기적으로 최신 정보(방송 상태, 투표 현황 등)를 확인(Polling)합니다.</li>
            <li>변경 사항이 감지될 경우 브라우저 자체 기능을 통해 알림을 표시합니다.</li>
            <li>이 과정에서 사용자의 식별 정보나 구독 토큰은 외부 서버로 전송되지 않습니다.</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h3>3-2. 기기 내 저장 정보(Local Storage)</h3>
          <p>서비스 편의 제공을 위해 아래 정보가 사용자의 기기(브라우저) 내 저장소에 저장될 수 있으며, 이는 서버로 전송되지 않습니다.</p>
          <ul>
            <li>알림 수신 설정 여부(ON/OFF 상태)</li>
            <li>중복 알림 방지 및 변화 감지를 위한 최근 데이터 상태 값</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h3>3-3. 알림 관리 및 주의사항</h3>
          <ul>
            <li>알림은 사용자의 브라우저 또는 기기 설정에서 언제든지 차단할 수 있습니다.</li>
            <li>서비스 작동 방식의 특성상, 브라우저나 앱을 완전히 종료(Kill Process)할 경우 알림이 수신되지 않을 수 있습니다.</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h3>4. 처리 목적</h3>
          <ul>
            <li>서비스의 기본적인 기능 제공 및 안정적 운영</li>
            <li>보안 유지, 비정상적인 접근 방지 및 오류 개선</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h3>5. 보유 및 이용기간</h3>
          <p>접속 로그 등 호스팅 환경에서 자동 생성되는 정보는 해당 플랫폼의 보안 및 운영 정책에 따라 일정 기간 보관될 수 있으며, 보관 목적이 달성되면 지체 없이 삭제됩니다.</p>
        </div>

        <div className="privacy-section">
          <h3>6. 처리위탁(호스팅)</h3>
          <p>본 서비스는 원활한 제공을 위해 아래와 같이 인프라 운영을 위탁하고 있습니다.</p>
          <ul>
            <li>수탁자: Vercel Inc.</li>
            <li>위탁 업무: 서비스 호스팅 및 클라우드 인프라 운영</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h3>7. 이용자의 권리 및 문의처</h3>
          <p>개인정보 관련 문의 또는 의견이 있으신 경우 아래 연락처로 문의해 주시기 바랍니다.</p>
          <ul>
            <li>이메일: (운영자 이메일 기재)</li>
          </ul>
        </div>

        <div className="privacy-section">
          <h3>8. 고지의 의무</h3>
          <p>본 방침은 법령 또는 서비스 변경에 따라 수정될 수 있으며, 내용의 추가·삭제 및 수정이 있을 시에는 변경 사항을 서비스 내 공지사항 등을 통해 안내합니다.</p>
          <p>향후 알림 기능이 외부 서버(FCM 등) 기반으로 변경될 경우, 본 방침을 통해 수집 항목 및 위탁 사항을 구체적으로 안내하겠습니다.</p>
        </div>

        <p className="privacy-date">부칙: 본 방침은 2026년 2월 12일부터 시행됩니다.</p>
      </div>

      <div className="guide-nav">
        <Link href="/settings" className="back-link">← 설정으로 돌아가기</Link>
      </div>
    </main>
  );
}
