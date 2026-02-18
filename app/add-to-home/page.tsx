"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other" | null;

interface Step {
  num: string;
  heading: string;
  highlight?: string;
  mockup: string;
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

export default function AddToHomePage() {
  const [platform, setPlatform] = useState<Platform>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "other");
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
        <img src="/guides/images/bottom_hero.png" alt="" className="pwa-hero-image" />
      </section>

      {/* Guide sections */}
      {platform === null && (
        <p className="pwa-loading">기기 정보 확인 중...</p>
      )}

      {platform === "ios" && (
        <GuideSection id="pwa-install-guide" title="iOS용 PWA 설치 방법?" accent="iOS용 PWA" steps={iosSteps} />
      )}

      {platform === "android" && (
        <GuideSection id="pwa-install-guide" title="Android용 PWA 설치 방법?" accent="Android용 PWA" steps={androidSteps} />
      )}

      {platform === "other" && (
        <>
          <GuideSection id="pwa-install-guide" title="iOS용 PWA 설치 방법?" accent="iOS용 PWA" steps={iosSteps} />
          <GuideSection title="Android용 PWA 설치 방법?" accent="Android용 PWA" steps={androidSteps} />
        </>
      )}
    </div>
  );
}
