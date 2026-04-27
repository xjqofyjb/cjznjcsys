import { useEffect, useState } from "react";
import { apiJson } from "../upload/api";
import { Badge, EmptyState, LoadingState, MetricCard, PageSection, SurfaceCard } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { formatDateTime, prettyBytes } from "../shared-ui/formatters";

export function LabPage({ lab }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDatasets() {
      setLoading(true);
      setError("");

      try {
        const result = await apiJson(`/datasets?lab=${encodeURIComponent(lab.key)}`);
        if (!cancelled) {
          setDatasets(Array.isArray(result) ? result : []);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || "加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDatasets();
    return () => {
      cancelled = true;
    };
  }, [lab.key]);

  return (
    <>
      <section className="lab-hero" style={{ backgroundImage: `${lab.gradient}, url(${lab.image})` }}>
        <div className="lab-hero__content">
          <Badge tone={lab.tone}>{lab.badge}</Badge>
          <h1>{lab.label}</h1>
          <p>{lab.summary}</p>
          <div className="lab-hero__chips">
            {lab.highlights.map((item) => (
              <span key={item} className="glass-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <PageSection eyebrow="Mission" title="实验室定位" subtitle={lab.mission}>
        <div className="metric-grid">
          {lab.stats.map((item) => (
            <MetricCard key={item.label} {...item} tone={lab.tone} />
          ))}
        </div>
      </PageSection>

      <PageSection
        eyebrow="Research Design"
        title="研究抓手"
        subtitle="围绕能力建设、方法体系与平台支撑，整理成更适合官网展示的结构。"
      >
        <div className="detail-grid">
          {lab.pillars.map((item) => (
            <SurfaceCard key={item.title} className="detail-card">
              <div className="detail-card__icon">
                <Icon type={item.iconType} size={18} color="#fff" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </SurfaceCard>
          ))}
        </div>

        <div className="split-layout">
          <SurfaceCard className="list-card">
            <div className="list-card__header">
              <Icon type="server" size={18} color="#0b6aa8" />
              <h3>核心平台</h3>
            </div>
            <div className="list-stack">
              {lab.platforms.map((item) => (
                <div key={item} className="list-stack__row">
                  <Icon type="chevronRight" size={14} color="#0b6aa8" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="list-card">
            <div className="list-card__header">
              <Icon type="spark" size={18} color="#0b6aa8" />
              <h3>关键词</h3>
            </div>
            <div className="tag-cloud">
              {lab.highlights.map((item) => (
                <Badge key={item} tone={lab.tone} subtle>
                  {item}
                </Badge>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </PageSection>

      <PageSection
        eyebrow="Published Datasets"
        title="实验室公开数据"
        subtitle="直接从后端数据接口读取，展示当前实验室已发布的数据资产。"
      >
        {loading ? <LoadingState title="正在拉取公开数据…" /> : null}
        {!loading && error ? <EmptyState iconType="shield" title="公开数据加载失败" description={error} /> : null}
        {!loading && !error && datasets.length === 0 ? (
          <EmptyState
            iconType="folder"
            title="暂时还没有公开数据"
            description="等实验室发布首批数据集后，这里会自动展示最新内容。"
          />
        ) : null}
        {!loading && !error && datasets.length > 0 ? (
          <div className="dataset-grid">
            {datasets.map((item) => (
              <SurfaceCard key={item.id} className="dataset-card">
                <div className="dataset-card__top">
                  <div>
                    <h3>{item.title}</h3>
                    <p>上传者：{item.uploader || "未知"}</p>
                  </div>
                  <Badge tone={lab.tone} subtle>
                    {item.version || "v1"}
                  </Badge>
                </div>

                <div className="dataset-card__facts">
                  <span>
                    <Icon type="file" size={14} />
                    {item.fileCount} 个文件
                  </span>
                  <span>
                    <Icon type="storage" size={14} />
                    {prettyBytes(item.totalSize)}
                  </span>
                  <span>
                    <Icon type="data" size={14} />
                    数据集 {item.datasetId}
                  </span>
                </div>

                <div className="dataset-card__footer">
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span>{item.files?.slice(0, 2).join(" · ") || "含元数据记录"}</span>
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : null}
      </PageSection>
    </>
  );
}
