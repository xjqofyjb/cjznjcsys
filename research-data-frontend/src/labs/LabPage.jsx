import { useEffect, useMemo, useState } from "react";
import { apiJson } from "../upload/api";
import { Badge, EmptyState, LoadingState, MetricCard, SurfaceCard } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { formatDateTime, prettyBytes } from "../shared-ui/formatters";

const labKnowledge = {
  "lab-water": {
    focus: "围绕长江三峡水资源调度、流域生态治理和数字孪生管理，形成从监测、评估到辅助决策的完整数据链。",
    scenarios: [
      "水文水资源监测数据汇聚",
      "防洪、供水、生态调度情景推演",
      "生态价值评估与治理绩效跟踪",
    ],
    methods: ["遥感与站点监测融合", "流域数字孪生", "多目标调度优化", "生态价值核算"],
    links: [
      {
        title: "水利部长江水利委员会",
        url: "https://www.cjw.gov.cn/",
        desc: "长江流域治理、水资源管理、防汛抗旱与水文信息入口。",
      },
      {
        title: "中华人民共和国水利部",
        url: "https://www.mwr.gov.cn/",
        desc: "水利政策、行业标准、规划公报和全国水利公开信息。",
      },
      {
        title: "中国长江三峡集团",
        url: "https://www.ctg.com.cn/",
        desc: "三峡工程、清洁能源、生态环保和流域综合管理参考。",
      },
    ],
  },
  "lab-migrant": {
    focus: "面向库区移民、人口流动和社会适应研究，支持问卷、统计、访谈与政策文本的综合分析。",
    scenarios: [
      "移民家庭生计韧性评估",
      "就业、教育、社区服务协同分析",
      "政策干预效果和群体行为模拟",
    ],
    methods: ["问卷数据治理", "社会网络分析", "多主体仿真", "政策文本编码"],
    links: [
      {
        title: "国家统计局",
        url: "https://www.stats.gov.cn/",
        desc: "人口、就业、收入、社会发展和区域统计公开信息。",
      },
      {
        title: "国家数据",
        url: "https://data.stats.gov.cn/",
        desc: "年度、季度、地区与普查数据查询，适合样本背景校验。",
      },
      {
        title: "中华人民共和国民政部",
        url: "https://www.mca.gov.cn/",
        desc: "社会救助、基层治理、社区服务和相关政策资料。",
      },
    ],
  },
  "lab-shipping": {
    focus: "聚焦三峡通航、港航联动和绿色航运，把船舶轨迹、通航状态与调度策略转化为可解释的决策支持。",
    scenarios: [
      "AIS 船舶轨迹与通航态势分析",
      "拥堵风险、异常行为和安全预警",
      "绿色通航调度与能耗排放优化",
    ],
    methods: ["轨迹挖掘", "时空预测", "排队与调度优化", "安全风险识别"],
    links: [
      {
        title: "中华人民共和国交通运输部",
        url: "https://www.mot.gov.cn/",
        desc: "交通运输政策、行业服务、统计公报和航运相关公开信息。",
      },
      {
        title: "交通运输部长江航务管理局",
        url: "https://www.cjhy.gov.cn/",
        desc: "长江干线航运管理、通航服务与行业公共服务参考。",
      },
      {
        title: "中华人民共和国海事局",
        url: "https://www.msa.gov.cn/",
        desc: "船舶、通航安全、海事监管与水上交通安全信息。",
      },
    ],
  },
  "lab-culture": {
    focus: "面向三峡文化传播、游客画像和景区数智运营，把内容资产、游客行为和服务场景连接起来。",
    scenarios: [
      "文化资源数字化与内容生成",
      "游客画像、客流预测和服务推荐",
      "景区运营看板与品牌传播评估",
    ],
    methods: ["AIGC 内容生产", "游客画像建模", "空间行为分析", "运营指标诊断"],
    links: [
      {
        title: "文化和旅游部",
        url: "https://www.mct.gov.cn/",
        desc: "文旅政策、公共服务、产业信息与官方发布入口。",
      },
      {
        title: "文化和旅游部政务服务门户",
        url: "https://zwfw.mct.gov.cn/",
        desc: "文旅政务服务、查询服务与行业名录入口。",
      },
      {
        title: "国家统计局",
        url: "https://www.stats.gov.cn/",
        desc: "文化及相关产业、居民消费与服务业统计参考。",
      },
    ],
  },
};

function mapPublicAssetToDataset(asset) {
  return {
    id: asset.id,
    title: asset.title || asset.file_name || "未命名资源",
    uploader: asset.metadata?.uploaderName || asset.owner_email,
    version: asset.version_label || "v1",
    totalSize: asset.file_size || 0,
    datasetId: asset.dataset_kind || "dataset",
    createdAt: asset.created_at,
    fileName: asset.file_name,
    description: asset.description || asset.metadata?.description || "",
    status: asset.status,
  };
}

function statusLabel(status) {
  const labels = {
    ready: "已发布",
    active: "已发布",
    completed: "已完成",
    processing: "处理中",
    archived: "已归档",
  };

  return labels[status] || status || "已收录";
}

function StudentDataRail({ lab, datasets, loading, error }) {
  return (
    <aside className="student-data-rail" aria-label={`${lab.shortLabel}学生上传数据`}>
      <SurfaceCard className="student-data-panel">
        <div className="student-data-panel__header">
          <div>
            <div className="section-eyebrow">Student Uploads</div>
            <h2>学生上传数据</h2>
          </div>
          <Badge tone={lab.tone} subtle>
            {datasets.length} 项
          </Badge>
        </div>
        <p className="student-data-panel__intro">
          这里展示已设置为公开、并关联到本分实验室的学生上传资源。后台审核通过后，前台会自动同步到此侧栏。
        </p>
      </SurfaceCard>

      {loading ? <LoadingState title="正在读取公开数据..." /> : null}
      {!loading && error ? <EmptyState iconType="shield" title="数据加载失败" description={error} /> : null}
      {!loading && !error && datasets.length === 0 ? (
        <SurfaceCard className="rail-empty-card">
          <div className="rail-empty-card__icon">
            <Icon type="folder" size={22} />
          </div>
          <h3>暂无公开上传</h3>
          <p>学生把资源设为公开并选择本分实验室后，会出现在这里。</p>
        </SurfaceCard>
      ) : null}

      {!loading && !error && datasets.length > 0 ? (
        <div className="student-data-list">
          {datasets.map((item) => (
            <SurfaceCard key={item.id} className="student-data-card">
              <div className="student-data-card__top">
                <Badge tone={lab.tone} subtle>
                  {item.version}
                </Badge>
                <span>{statusLabel(item.status)}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.description || item.fileName || "暂无资源说明"}</p>
              <div className="student-data-card__meta">
                <span>
                  <Icon type="storage" size={13} />
                  {prettyBytes(item.totalSize)}
                </span>
                <span>
                  <Icon type="users" size={13} />
                  {item.uploader || "未知上传者"}
                </span>
              </div>
              <div className="student-data-card__footer">
                <span>{formatDateTime(item.createdAt)}</span>
                <span>{item.datasetId}</span>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

export function LabPage({ lab }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const knowledge = useMemo(() => labKnowledge[lab.key] || labKnowledge["lab-water"], [lab.key]);

  useEffect(() => {
    let cancelled = false;

    async function loadDatasets() {
      setLoading(true);
      setError("");

      try {
        const result = await apiJson(`/public/assets?lab=${encodeURIComponent(lab.key)}`);
        if (!cancelled) {
          setDatasets((result?.items || []).map(mapPublicAssetToDataset));
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || "加载公开数据失败");
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

      <section className="lab-content-shell">
        <main className="lab-content-main">
          <SurfaceCard className="lab-overview-panel">
            <div className="lab-overview-panel__copy">
              <div className="section-eyebrow">Lab Brief</div>
              <h2>研究定位</h2>
              <p>{lab.mission}</p>
              <p>{knowledge.focus}</p>
            </div>
            <div className="lab-overview-panel__aside">
              <span>数据工作流</span>
              <strong>采集 → 治理 → 建模 → 决策 → 发布</strong>
            </div>
          </SurfaceCard>

          <div className="metric-grid">
            {lab.stats.map((item) => (
              <MetricCard key={item.label} {...item} tone={lab.tone} />
            ))}
          </div>

          <section className="lab-main-section">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">Research Modules</div>
                <h2 className="section-title">研究模块</h2>
                <p className="section-subtitle">
                  将分实验室的研究方向拆成可持续扩展的模块，方便后续继续接入数据、模型和项目成果。
                </p>
              </div>
            </div>
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
          </section>

          <section className="lab-main-section">
            <div className="lab-insight-grid">
              <SurfaceCard className="list-card lab-insight-card">
                <div className="list-card__header">
                  <Icon type="target" size={18} color="#0b6aa8" />
                  <h3>典型应用场景</h3>
                </div>
                <div className="list-stack">
                  {knowledge.scenarios.map((item) => (
                    <div key={item} className="list-stack__row">
                      <Icon type="chevronRight" size={14} color="#0b6aa8" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard className="list-card lab-insight-card">
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
            </div>
          </section>

          <section className="lab-main-section">
            <SurfaceCard className="method-strip">
              <div>
                <div className="section-eyebrow">Methods</div>
                <h2>方法与工具</h2>
              </div>
              <div className="method-strip__tags">
                {knowledge.methods.map((item) => (
                  <Badge key={item} tone={lab.tone} subtle>
                    {item}
                  </Badge>
                ))}
              </div>
            </SurfaceCard>
          </section>

          <section className="lab-main-section">
            <div className="section-header">
              <div>
                <div className="section-eyebrow">Reference Links</div>
                <h2 className="section-title">相关公开资源</h2>
                <p className="section-subtitle">
                  这些入口指向可直接访问的官方站点，适合作为数据校验、政策背景和行业信息的补充来源。
                </p>
              </div>
            </div>
            <div className="lab-link-grid">
              {knowledge.links.map((item) => (
                <a key={item.url} className="lab-reference-card" href={item.url} target="_blank" rel="noreferrer">
                  <div className="lab-reference-card__icon">
                    <Icon type="globe" size={18} />
                  </div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                  </div>
                  <span className="lab-reference-card__arrow">
                    <Icon type="arrowRight" size={16} />
                  </span>
                </a>
              ))}
            </div>
          </section>
        </main>

        <StudentDataRail lab={lab} datasets={datasets} loading={loading} error={error} />
      </section>
    </>
  );
}
