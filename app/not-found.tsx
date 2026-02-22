import Link from "next/link";

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-inner">
        <p className="notfound-code">404</p>
        <h1 className="notfound-title">페이지를 찾을 수 없어요</h1>
        <p className="notfound-desc">
          주소가 잘못됐거나 삭제된 페이지예요.
        </p>
        <Link href="/" className="notfound-btn">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
