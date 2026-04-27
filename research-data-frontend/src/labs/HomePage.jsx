import { PageSection, SurfaceCard, MetricCard, Button, Badge } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { labs } from "./data";
import { resourceCenters } from "../resource-centers/config";

const overviewMetrics = [
  { value: "28+", label: "专题数据集", iconType: "database", tone: "ocean" },
  { value: "120K+", label: "累计文件资产", iconType: "folder", tone: "aurora" },
  { value: "3.4 TB", label: "存储容量", iconType: "storage", tone: "violet" },
  { value: "60+", label: "活跃协作成员", iconType: "users", tone: "copper" },
];

const newsroom = [
  { title: "三峡通航态势分析项目进入联合验证阶段", tag: "平台建设", date: "2026.04.21" },
  { title: "库区移民生计问卷新一轮样本归档完成", tag: "调查进展", date: "2026.04.15" },
  { title: "生态价值核算工具箱更新至 2.1 版", tag: "方法更新", date: "2026.04.09" },
];

export function HomePage({ onEnterLab, onEnterResource, onOpenDataCenter }) {
  return (
    <>
      <section className="hero-banner">
        <div className="hero-banner__copy">
          <Badge tone="ocean" subtle>
            Research-ready workspace
          </Badge>
          <h1>把实验室资料、数据、代码和问卷沉淀成真正可运营的平台。</h1>
          <p>
            这套前端围绕科研资产全生命周期设计：展示更专业、信息更有层次，上传与归档也从单文件原型升级为可长期维护的模块化结构。
          </p>
          <div className="hero-banner__actions">
            <Button onClick={onOpenDataCenter}>
              <Icon type="data" size={16} />
              <span>进入数据中心</span>
            </Button>
            <Button variant="secondary" onClick={() => onEnterResource("learning")}>
              <Icon type="book" size={16} />
              <span>浏览学习中心</span>
            </Button>
          </div>
        </div>

        <SurfaceCard className="hero-banner__panel">
          <div className="hero-banner__visual">
            <img src="/hero1.jpg" alt="三峡实验室平台展示" />
          </div>
          <div className="hero-banner__news">
            <div className="section-eyebrow">Latest Signals</div>
            {newsroom.map((item) => (
              <div key={item.title} className="signal-row">
                <div className="signal-row__tag">{item.tag}</div>
                <div className="signal-row__title">{item.title}</div>
                <div className="signal-row__date">{item.date}</div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <PageSection
        eyebrow="Platform Snapshot"
        title="平台全景"
        subtitle="用更清晰的信息层次展示科研平台当前规模和协作状态。"
      >
        <div className="metric-grid">
          {overviewMetrics.map((item) => (
            <MetricCard key={item.label} {...item} />
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Research Labs"
        title="专题实验室"
        subtitle="四个实验室以统一结构展示研究主题、平台能力和公开数据，视觉上更像正式官网。"
      >
        <div className="lab-grid">
          {labs.map((lab) => (
            <button
              key={lab.key}
              className="lab-tile"
              style={{ backgroundImage: `${lab.gradient}, url(${lab.image})` }}
              onClick={() => onEnterLab(lab.key)}
            >
              <div className="lab-tile__badge">{lab.badge}</div>
              <div className="lab-tile__body">
                <div className="lab-tile__icon">
                  <Icon type={lab.iconType} size={22} color="#fff" />
                </div>
                <h3>{lab.shortLabel}</h3>
                <p>{lab.summary}</p>
              </div>
              <div className="lab-tile__footer">
                <span>{lab.highlights.join(" · ")}</span>
                <Icon type="arrowRight" size={16} color="#fff" />
              </div>
            </button>
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Knowledge Flows"
        title="资源中心"
        subtitle="把资料、代码和问卷设计成统一的信息中心，而不是分散的孤立页面。"
      >
        <div className="resource-grid">
          {resourceCenters.map((center) => (
            <SurfaceCard key={center.key} className="resource-card">
              <div className="resource-card__icon" style={{ backgroundImage: center.gradient }}>
                <Icon type={center.iconType} size={22} color="#fff" />
              </div>
              <h3>{center.label}</h3>
              <p>{center.subtitle}</p>
              <div className="resource-card__meta">
                <span>{center.categories.slice(1, 4).join(" · ")}</span>
              </div>
              <Button variant="secondary" onClick={() => onEnterResource(center.key)}>
                <span>进入 {center.label}</span>
                <Icon type="arrowRight" size={16} />
              </Button>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>
    </>
  );
}
