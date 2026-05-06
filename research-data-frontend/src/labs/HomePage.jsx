import { useState } from "react";
import { Badge, Button } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { labs } from "./data";

const labCardMeta = {
  "lab-water": {
    accent: "#0b6aa8",
    secondary: "#37c5e8",
    ink: "#f3fbff",
    motif: "wave",
    label: "Water Intelligence",
  },
  "lab-migrant": {
    accent: "#5c56c9",
    secondary: "#f2d18b",
    ink: "#fff8e9",
    motif: "grid",
    label: "Social Simulation",
  },
  "lab-shipping": {
    accent: "#0b7f74",
    secondary: "#70f0c2",
    ink: "#effffb",
    motif: "route",
    label: "Navigation Decision",
  },
  "lab-culture": {
    accent: "#b45a20",
    secondary: "#ffd287",
    ink: "#fff7ee",
    motif: "spark",
    label: "Culture Computing",
  },
};

const cardOffsets = [
  { rotate: -10, shift: -198, depth: 0 },
  { rotate: -3, shift: -68, depth: 1 },
  { rotate: 4, shift: 68, depth: 2 },
  { rotate: 11, shift: 198, depth: 3 },
];

function CardMotif({ type }) {
  return (
    <div className={`lab-card-motif lab-card-motif--${type}`} aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function HomePage({ onEnterLab, onOpenDataCenter }) {
  const [focusedLab, setFocusedLab] = useState(labs[2]?.key || labs[0]?.key || "");
  const activeLab = labs.find((lab) => lab.key === focusedLab) || labs[0];

  return (
    <section className="home-stage">
      <div className="home-stage__intro">
        <Badge tone="ocean" subtle>
          Yangtze Three Gorges Data Center
        </Badge>
        <div className="home-stage__line" />
        <h1>长江三峡数字化管理与智能决策实验室（数据中心）</h1>
        <p>
          面向水资源、移民生计、通航调度与文旅运营的综合数据门户，连接实验室介绍、数据上传、资源发布与决策支持。
        </p>
        <div className="home-stage__actions">
          <Button onClick={onOpenDataCenter}>
            <Icon type="data" size={16} />
            <span>进入数据中心</span>
          </Button>
          <Button variant="secondary" onClick={() => onEnterLab(activeLab?.key || labs[0]?.key || "home")}>
            <Icon type="lab" size={16} />
            <span>查看当前实验室</span>
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
                  "--card-secondary": meta.secondary,
                  "--card-ink": meta.ink,
                  "--card-rotate": `${offset.rotate}deg`,
                  "--card-shift": `${offset.shift}px`,
                  "--card-depth": offset.depth,
                }}
              >
                <div className="lab-showcase__shine" />
                <div className="lab-showcase__graphic">
                  <CardMotif type={meta.motif} />
                </div>
                <div className="lab-showcase__content">
                  <span className="lab-showcase__badge">{meta.label}</span>
                  <h2>{lab.shortLabel}</h2>
                </div>
                <div className="lab-showcase__footer">
                  <span>{lab.badge}</span>
                  <Icon type="arrowRight" size={16} />
                </div>
              </button>
            );
          })}
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
