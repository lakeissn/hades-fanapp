"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other" | null;

interface Step {
  num: string;
  heading: string;
  highlight?: string;
  mockup: string;
}

interface InAppInfo {
  detected: boolean;
  name: string;
}

function detectInAppBrowser(ua: string): InAppInfo {
  if (/KAKAOTALK/i.test(ua)) return { detected: true, name: "카카오톡" };
  if (/NAVER/i.test(ua)) return { detected: true, name: "네이버" };
  if (/Instagram/i.test(ua)) return { detected: true, name: "인스타그램" };
  if (/FBAN|FBAV/i.test(ua)) return { detected: true, name: "페이스북" };
  if (/Line\//i.test(ua)) return { detected: true, name: "라인" };
  if (/Twitter(?:Bot)?\/|twitter\.com/i.test(ua)) return { detected: true, name: "트위터" };
  return { detected: false, name: "" };
}

const iosSteps: Step[] = [
  { num: "01", heading: "공유하기를 탭하세요", highlight: "공유하기", mockup: "/guides/images/ios_setup_1.jpg" },
  { num: "02", heading: "화면을 내리고\n홈 스크린에 추가를 탭하세요", highlight: "홈 스크린에 추가", mockup: "/guides/images/ios_setup_2.jpg" },
  { num: "03", heading: "추가를 탭하고 확인하세요", highlight: "추가", mockup: "/guides/images/ios_setup_3.jpg" },
  { num: "04", heading: "홈 스크린에서\nHADES INFO 앱을\n즐겨보세요", highlight: "HADES INFO", mockup: "/guides/images/ios_setup_4.jpg" },
];

const androidSteps: Step[] = [
  { num: "01", heading: "메뉴를 열려면\n(⋮)를 탭하세요", highlight: "(⋮)", mockup: "" },
  { num: "02", heading: "홈 스크린에 추가를\n선택하세요", highlight: "홈 스크린에 추가", mockup: "" },
  { num: "03", heading: "설치하기를 탭하고\n확인하세요", highlight: "설치하기", mockup: "" },
  { num: "04", heading: "홈 스크린에서\nHADES INFO 앱을\n즐겨보세요", highlight: "HADES INFO", mockup: "" },
];

function StepHeading({ heading, highlight }: { heading: string; highlight?: string }) {
  if (!highlight) {
    return <>{heading}</>;
  }
  const parts = heading.split(highlight);
  return (
    <>
      {parts[0]}
      <span className="pwa-step-highlight">{highlight}</span>
      {parts.slice(1).join(highlight)}
    </>
  );
}

function StepBlock({ step }: { step: Step }) {
  return (
    <div className="pwa-step">
      <span className="pwa-step-num">{step.num}</span>
      <h3 className="pwa-step-heading">
        <StepHeading heading={step.heading} highlight={step.highlight} />
      </h3>
      <div className="pwa-step-mockup">
        {step.mockup ? (
          <img src={step.mockup} alt={`Step ${step.num}`} />
        ) : (
          <div className="pwa-step-mockup-ph" />
        )}
      </div>
    </div>
  );
}

function GuideSection({ title, accent, steps, id }: { title: string; accent: string; steps: Step[]; id?: string }) {
  return (
    <section className="pwa-guide" id={id}>
      <h2 className="pwa-guide-title">
        <span className="pwa-guide-accent">{accent}</span>
        {title.replace(accent, "")}
      </h2>
      {steps.map((s) => (
        <StepBlock key={s.num} step={s} />
      ))}
    </section>
  );
}

function InAppBrowserNotice({ appName, platform }: { appName: string; platform: Platform }) {
  const [copied, setCopied] = useState(false);

  const openInChrome = () => {
    const url = window.location.href;
    const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const isAndroid = platform === "android";

  return (
    <section className="pwa-inapp-notice" id="pwa-install-guide">
      <div className="pwa-inapp-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="pwa-inapp-title">
        {appName} 앱에서는<br />설치가 제한돼요
      </h2>

      <p className="pwa-inapp-desc">
        {appName} 인앱 브라우저는 PWA 설치를 지원하지 않아요.{"\n"}
        {isAndroid ? "크롬(Chrome)" : "사파리(Safari)"}에서 열면 바로 설치할 수 있어요.
      </p>

      {isAndroid ? (
        <div className="pwa-inapp-actions">
          <button type="button" className="pwa-inapp-btn pwa-inapp-btn--primary" onClick={openInChrome}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <path d="M12 8h8M6.8 14l-4 6.9M17.2 14l4 6.9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            크롬으로 열기
          </button>
          <button type="button" className="pwa-inapp-btn pwa-inapp-btn--secondary" onClick={copyUrl}>
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                복사됨
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                주소 복사
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="pwa-inapp-actions">
          <button type="button" className="pwa-inapp-btn pwa-inapp-btn--secondary" onClick={copyUrl}>
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                복사됨
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                주소 복사
              </>
            )}
          </button>
        </div>
      )}

      <ol className="pwa-inapp-steps">
        {isAndroid ? (
          <>
            <li>위의 <strong>크롬으로 열기</strong> 버튼을 탭하세요</li>
            <li>크롬이 열리면 하단 배너의 <strong>설치</strong> 버튼을 탭하세요</li>
            <li>홈 화면에서 <strong>HADES INFO</strong> 앱을 즐겨보세요</li>
          </>
        ) : (
          <>
            <li>위의 <strong>주소 복사</strong>를 탭하세요</li>
            <li><strong>Safari</strong>를 열고 주소창에 붙여넣기 하세요</li>
            <li>하단 공유 버튼 → <strong>홈 화면에 추가</strong>를 선택하세요</li>
          </>
        )}
      </ol>
    </section>
  );
}

export default function AddToHomePage() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [inApp, setInApp] = useState<InAppInfo>({ detected: false, name: "" });

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "other");
    setInApp(detectInAppBrowser(ua));
  }, []);

  return (
    <div className="pwa-page">
      {/* Hero */}
      <section className="pwa-hero">
        <div className="pwa-hero-brand">
          <img src="/icons/hades_helper.png" alt="" width={48} height={48} className="pwa-hero-logo" />
          <span className="pwa-hero-name">HADES INFO</span>
        </div>
        <h1 className="pwa-hero-title">
          케로만의{" "}<br />
          <span className="pwa-accent">HADES INFO APP</span>
        </h1>
        <button
          type="button"
          className="pwa-hero-cta"
          onClick={() => {
            document.getElementById("pwa-install-guide")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          APP 설치하기
        </button>
        <img src="/guides/images/하데스_배너-removebg.png" alt="" className="pwa-hero-image" />
      </section>

      {/* Guide sections */}
      {platform === null && (
        <p className="pwa-loading">기기 정보 확인 중...</p>
      )}

      {platform !== null && inApp.detected && (
        <InAppBrowserNotice appName={inApp.name} platform={platform} />
      )}

      {platform !== null && !inApp.detected && (
        <>
          {platform === "ios" && (
            <GuideSection id="pwa-install-guide" title="iOS용 APP 설치 방법?" accent="iOS용 APP" steps={iosSteps} />
          )}

          {platform === "android" && (
            <GuideSection id="pwa-install-guide" title="Android용 APP 설치 방법?" accent="Android용 APP" steps={androidSteps} />
          )}

          {platform === "other" && (
            <>
              <GuideSection id="pwa-install-guide" title="iOS용 APP 설치 방법?" accent="iOS용 APP" steps={iosSteps} />
              <GuideSection title="Android용 APP 설치 방법?" accent="Android용 APP" steps={androidSteps} />
            </>
          )}
        </>
      )}
    </div>
  );
}
