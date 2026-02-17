"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other" | null;

export default function AddToHomePage() {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    setPlatform(isIOS ? "ios" : isAndroid ? "android" : "other");
  }, []);

  return (
    <main className="add-to-home-page">
      <button type="button" className="add-to-home-back" onClick={() => router.back()}>
        <ChevronLeft size={14} strokeWidth={2.5} />
        뒤로가기
      </button>

      <div className="add-to-home-hero">
        <div className="add-to-home-icon-wrap">
          <img src="/icons/hades_helper.png" alt="" width={80} height={80} className="add-to-home-icon" />
        </div>
        <h1 className="add-to-home-title">HADES INFO 앱으로 사용하기</h1>
        <p className="add-to-home-desc">
          홈 화면에 추가하면 앱처럼 빠르게 이용할 수 있어요
        </p>
      </div>

      {platform === null && (
        <div className="add-to-home-loading">
          <span>기기 정보 확인 중...</span>
        </div>
      )}

      {platform === "ios" && (
        <div className="add-to-home-steps">
          <h2 className="add-to-home-steps-title">Safari에서 홈 화면에 추가</h2>

          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <div className="add-to-home-step-num">1</div>
              <span className="add-to-home-step-text">하단의 <strong>공유 버튼</strong>을 누르세요</span>
            </div>
            {/* TODO: 실제 스크린샷으로 교체 */}
            <img className="add-to-home-step-img" src="/guide/ios-share.png" alt="Safari 공유 버튼 위치" />
            <p className="add-to-home-step-hint">Safari 하단 중앙 또는 우측 하단에 위치해요</p>
          </div>

          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <div className="add-to-home-step-num">2</div>
              <span className="add-to-home-step-text"><strong>홈 화면에 추가</strong>를 선택하세요</span>
            </div>
            {/* TODO: 실제 스크린샷으로 교체 */}
            <img className="add-to-home-step-img" src="/guide/ios-add.png" alt="홈 화면에 추가 메뉴" />
            <p className="add-to-home-step-hint">목록을 스크롤하면 찾을 수 있어요</p>
          </div>

          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <div className="add-to-home-step-num">3</div>
              <span className="add-to-home-step-text">우측 상단 <strong>추가</strong>를 눌러 완료!</span>
            </div>
            {/* TODO: 실제 스크린샷으로 교체 */}
            <img className="add-to-home-step-img" src="/guide/ios-confirm.png" alt="추가 확인 화면" />
            <p className="add-to-home-step-hint">홈 화면에 HADES INFO 아이콘이 생성됩니다</p>
          </div>
        </div>
      )}

      {platform === "android" && (
        <div className="add-to-home-steps">
          <h2 className="add-to-home-steps-title">Chrome에서 앱 설치</h2>

          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <div className="add-to-home-step-num">1</div>
              <span className="add-to-home-step-text">주소창 오른쪽 <strong>⋮ 메뉴</strong>를 누르세요</span>
            </div>
            {/* TODO: 실제 스크린샷으로 교체 */}
            <img className="add-to-home-step-img" src="/guide/android-menu.png" alt="Chrome 메뉴 버튼" />
            <p className="add-to-home-step-hint">화면 우측 상단 점 3개 아이콘이에요</p>
          </div>

          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <div className="add-to-home-step-num">2</div>
              <span className="add-to-home-step-text"><strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong> 선택</span>
            </div>
            {/* TODO: 실제 스크린샷으로 교체 */}
            <img className="add-to-home-step-img" src="/guide/android-install.png" alt="앱 설치 메뉴" />
            <p className="add-to-home-step-hint">브라우저에 따라 문구가 다를 수 있어요</p>
          </div>

          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <div className="add-to-home-step-num">3</div>
              <span className="add-to-home-step-text"><strong>설치</strong>를 눌러 완료!</span>
            </div>
            {/* TODO: 실제 스크린샷으로 교체 */}
            <img className="add-to-home-step-img" src="/guide/android-confirm.png" alt="설치 확인 팝업" />
            <p className="add-to-home-step-hint">홈 화면 또는 앱 서랍에 추가됩니다</p>
          </div>
        </div>
      )}

      {platform === "other" && (
        <div className="add-to-home-steps">
          <h2 className="add-to-home-steps-title">모바일에서 설치하기</h2>
          <div className="add-to-home-step">
            <div className="add-to-home-step-header">
              <span className="add-to-home-step-text">모바일 기기에서 이 페이지를 열어 주세요</span>
            </div>
            <p className="add-to-home-step-hint">
              iPhone/iPad: Safari 공유 → 홈 화면에 추가<br />
              Android: Chrome 메뉴 → 앱 설치 또는 홈 화면에 추가
            </p>
          </div>
        </div>
      )}

      <p className="add-to-home-footer">
        설치 후 앱 아이콘을 눌러 바로 이용하세요
      </p>
    </main>
  );
}
