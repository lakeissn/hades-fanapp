"use client";

import Link from "next/link";
import { guideData, GUIDE_ORDER } from "./guideData";

export default function GuidesPage() {
  const categories = GUIDE_ORDER.map((id) => ({ id, ...guideData[id] })).filter(Boolean);

  return (
    <main>
      <section className="section-block">
        <div className="section-head page-header">
          <div><h2>가이드</h2></div>
        </div>

        <div className="guides-grid">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/guides/${cat.id}`} className="guide-tile">
              <span className="guide-tile-icon" aria-hidden>
                {cat.iconImage ? <img src={cat.iconImage} alt="" width={cat.iconSize ?? 48} height={cat.iconSize ?? 48} style={{ objectFit: "contain" }} /> : cat.icon}
              </span>
              <h3 className="guide-tile-title">{cat.title}</h3>
              <p className="guide-tile-desc">{cat.subtitle}</p>
              <span className="guide-tile-count">{cat.items.length}개 항목</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
