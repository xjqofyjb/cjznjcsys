import { useMemo, useState } from "react";
import { Badge, Button } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { labs } from "./data";

const labCardMeta = {
  "lab-water": {
    accent: "#f35a10",
    pattern: "linear-gradient(180deg, rgba(255,255,255,0.9) 0 2px, transparent 2px 8px)",
  },
  "lab-migrant": {
    accent: "#efe3cf",
    pattern: "linear-gradient(90deg, rgba(85,71,53,0.18) 0 7px, transparent 7px 12px)",
  },
  "lab-shipping": {
    accent: "#2094df",
    pattern: "linear-gradient(180deg, rgba(255,255,255,0.24) 0 2px, transparent 2px 5px)",
  },
  "lab-culture": {
    accent: "#52eb8f",
    pattern: "linear-gradient(90deg, rgba(17,88,51,0.18) 0 3px, transparent 3px 6px)",
  },
};

const cardOffsets = [
  { rotate: -12, shift: -186, depth: 0 },
  { rotate: -4, shift: -64, depth: 1 },
  { rotate: 4, shift: 64, depth: 2 },
  { rotate: 12, shift: 186, depth: 3 },
];

export function HomePage({ onEnterLab, onOpenDataCenter }) {
  const [focusedLab, setFocusedLab] = useState(labs[2]?.key || labs[0]?.key || "");

  const activeLab = useMemo(
    () => labs.find((lab) => lab.key === focusedLab) || labs[0],
    [focusedLab],
  );

  return (
    <section className="home-stage">
      <div className="home-stage__intro">
        <Badge tone="ocean" subtle>
          Yangtze Three Gorges Research Platform
        </Badge>
        <div className="home-stage__line" />
        <h1>长江三峡数字化管理与智能决策实验室</h1>
        <p>
          首页现在聚焦一个更清晰的入口：实验室介绍、统一顶栏，以及四个分实验室方向的交互卡片。我们把视觉语言收得更克制，同时保留足够的层次感和展陈感。
        </p>
        <div className="home-stage__actions">
          <Button onClick={onOpenDataCenter}>
            <Icon type="data" size={16} />
            <span>进入数据中心</span>
          </Button>
          <Button variant="secondary" onClick={() => onEnterLab(activeLab?.key || labs[0]?.key || "home")}>
            <Icon type="lab" size={16} />
            <span>进入当前实验室</span>
          </Button>
        </div>
      </div>

      <div className="lab-showcase">
        <div className="lab-showcase__stack">
          {labs.map((lab, index) => {
            const meta = labCardMeta[lab.key] || labCardMeta["lab-water"];
            const offset = cardOffsets[index] || cardOffsets[0];
            const isActive = focusedLab === lab.key;
            const isDimmed = focusedLab && focusedLab !== lab.key;

            return (
              <button
                key={lab.key}
                className={`lab-showcase__card ${isActive ? "is-active" : ""} ${isDimmed ? "is-dimmed" : ""}`.trim()}
                onMouseEnter={() => setFocusedLab(lab.key)}
                onFocus={() => setFocusedLab(lab.key)}
                onClick={() => onEnterLab(lab.key)}
                style={{
                  "--card-accent": meta.accent,
                  "--card-pattern": meta.pattern,
                  "--card-rotate": `${offset.rotate}deg`,
                  "--card-shift": `${offset.shift}px`,
                  "--card-depth": offset.depth,
                }}
              >
                <div className="lab-showcase__graphic" />
                <div className="lab-showcase__content">
                  <span className="lab-showcase__badge">{lab.badge}</span>
                  <h2>{lab.shortLabel}</h2>
                  <p>{lab.summary}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lab-showcase__detail">
          <div className="lab-showcase__detail-eyebrow">Focused Lab</div>
          <h3>{activeLab?.label}</h3>
          <p>{activeLab?.mission}</p>
          <div className="lab-showcase__detail-tags">
            {activeLab?.highlights?.map((item) => (
              <span key={item} className="lab-showcase__detail-chip">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="lab-showcase__legend">
          {labs.map((lab) => {
            const isActive = focusedLab === lab.key;
            return (
              <button
                key={lab.key}
                className={`lab-showcase__legend-item ${isActive ? "is-active" : ""}`.trim()}
                onMouseEnter={() => setFocusedLab(lab.key)}
                onFocus={() => setFocusedLab(lab.key)}
                onClick={() => onEnterLab(lab.key)}
              >
                <span className="lab-showcase__legend-dot" style={{ background: labCardMeta[lab.key]?.accent }} />
                <strong>{lab.shortLabel}</strong>
                <span>{lab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
