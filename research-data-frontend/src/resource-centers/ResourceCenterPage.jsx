import { useEffect, useMemo, useRef, useState } from "react";
import { labs } from "../labs/data";
import { Badge, Button, EmptyState, LoadingState, MetricCard, PageSection, SurfaceCard } from "../shared-ui/components";
import { AssetPreviewModal } from "../shared-ui/AssetPreviewModal";
import { Icon } from "../shared-ui/icons";
import { formatDateTime, prettyBytes } from "../shared-ui/formatters";
import { apiJson } from "../upload/api";
import { uploadFileViaMultipart } from "../upload/multipartUpload";

const toneMetrics = {
  learning: [
    { value: "48+", label: "知识条目", iconType: "book" },
    { value: "12", label: "标准模板", iconType: "layers" },
    { value: "9", label: "常用工具链", iconType: "spark" },
  ],
  code: [
    { value: "32", label: "算法项目", iconType: "code" },
    { value: "15", label: "可复现实验", iconType: "monitor" },
    { value: "7", label: "核心框架", iconType: "layers" },
  ],
  survey: [
    { value: "26", label: "调查项目", iconType: "survey" },
    { value: "10k+", label: "样本记录", iconType: "users" },
    { value: "18", label: "区域专题", iconType: "globe" },
  ],
};

function buildItemSummary(item) {
  const metadata = item.metadata || {};
  const extraValues = metadata.extraValues || {};
  const tags = [];

  if (metadata.category) tags.push(metadata.category);
  for (const value of Object.values(extraValues)) {
    if (value) {
      tags.push(String(value));
    }
  }

  return {
    id: item.id,
    title: item.title,
    summary: item.description || metadata.description || "已上传到资源中心，等待进一步整理与引用。",
    category: metadata.category || item.dataset_kind,
    author: metadata.uploaderName || item.owner_email,
    updatedAt: item.updated_at,
    tags: tags.slice(0, 4),
    fileName: item.file_name,
    file_name: item.file_name,
    fileSize: item.file_size,
    file_size: item.file_size,
    contentType: item.content_type,
    content_type: item.content_type,
    labKey: item.lab_key,
  };
}

export function ResourceCenterPage({ config, auth, onRequireAuth }) {
  const allCategory = config.categories[0] || "All";
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState(allCategory);
  const [submitCategory, setSubmitCategory] = useState(config.categories[1] || config.categories[0] || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labKey, setLabKey] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("等待上传");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [items, setItems] = useState([]);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [extraValues, setExtraValues] = useState(() =>
    Object.fromEntries((config.extraFields || []).map((field) => [field.key, ""])),
  );
  const totalRef = useRef(0);
  const doneRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      setLoadingItems(true);
      setItemsError("");

      try {
        const result = await apiJson(`/public/assets?centerKey=${encodeURIComponent(config.key)}`);
        if (!cancelled) {
          setItems((result?.items || []).map(buildItemSummary));
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setItemsError(error.message || "加载资源中心内容失败");
        }
      } finally {
        if (!cancelled) {
          setLoadingItems(false);
        }
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, [config.key, refreshKey]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = filterCategory === allCategory || item.category === filterCategory;
      const haystack = `${item.title} ${item.summary} ${item.tags.join(" ")} ${item.author}`.toLowerCase();
      return matchesCategory && haystack.includes(query);
    });
  }, [allCategory, filterCategory, items, search]);

  function updateExtraValue(key, value) {
    setExtraValues((current) => ({ ...current, [key]: value }));
  }

  function pushLog(message) {
    setLogs((current) => [message, ...current].slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!auth.authed) {
      onRequireAuth();
      return;
    }

    if (!title.trim() || files.length === 0) {
      return;
    }

    setSubmitting(true);
    setStatus("开始上传");
    setLogs([]);
    setProgress(0);
    totalRef.current = files.reduce((sum, file) => sum + file.size, 0);
    doneRef.current = 0;

    try {
      for (const file of files) {
        pushLog(`上传 ${file.name}`);
        await uploadFileViaMultipart({
          file,
          title: title.trim(),
          description: description.trim(),
          datasetKind: config.key,
          versionLabel: config.version,
          labKey: labKey || undefined,
          visibility,
          metadata: {
            centerKey: config.key,
            centerLabel: config.label,
            uploaderName: auth.user?.displayName || "",
            uploaderEmail: auth.user?.email || "",
            category: submitCategory,
            extraValues,
          },
          onStatus: setStatus,
          onPart: (_part, _count, size) => {
            doneRef.current += size;
            setProgress(Math.round((doneRef.current * 100) / Math.max(totalRef.current, 1)));
          },
        });
      }

      setStatus("上传完成");
      setProgress(100);
      pushLog("资源已进入归档系统");
      setTitle("");
      setDescription("");
      setLabKey("");
      setVisibility("public");
      setFiles([]);
      setExtraValues(Object.fromEntries((config.extraFields || []).map((field) => [field.key, ""])));
      setRefreshKey((current) => current + 1);
      setView("overview");
    } catch (error) {
      setStatus("上传失败");
      pushLog(error.message || "上传失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="hero-banner hero-banner--compact">
        <div className="hero-banner__copy">
          <Badge tone={config.tone} subtle>
            {config.eyebrow}
          </Badge>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
      </section>

      <PageSection
        eyebrow="Center Overview"
        title={config.label}
        subtitle="现在这里会直接读取已经公开发布的真实资源，不再只是静态样例。"
      >
        <div className="metric-grid">
          {(toneMetrics[config.key] || []).map((item) => (
            <MetricCard key={item.label} {...item} tone={config.tone} />
          ))}
        </div>

        <div className="toolbar toolbar--tabs">
          {[
            { key: "overview", label: "资源浏览" },
            { key: "submit", label: "提交归档" },
          ].map((item) => (
            <button
              key={item.key}
              className={`toolbar-chip ${view === item.key ? "is-active" : ""}`}
              onClick={() => setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {view === "overview" ? (
          <>
            <div className="toolbar">
              <div className="toolbar__chips">
                {config.categories.map((item) => (
                  <button
                    key={item}
                    className={`toolbar-chip ${filterCategory === item ? "is-active" : ""}`}
                    onClick={() => setFilterCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <label className="toolbar__search">
                <Icon type="search" size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`搜索${config.label}内容`} />
              </label>
            </div>

            {loadingItems ? <LoadingState title="正在读取资源中心内容..." /> : null}
            {!loadingItems && itemsError ? <EmptyState iconType="shield" title="资源中心加载失败" description={itemsError} /> : null}
            {!loadingItems && !itemsError && filteredItems.length === 0 ? (
              <EmptyState iconType={config.iconType} title="暂时还没有公开资源" description="把资源设为公开后，这里会自动显示最新上传内容。" />
            ) : null}
            {!loadingItems && !itemsError && filteredItems.length > 0 ? (
              <div className="dataset-grid">
                {filteredItems.map((item) => (
                  <SurfaceCard key={item.id} className="dataset-card">
                    <div className="dataset-card__top">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>
                      </div>
                      <Badge tone={config.tone} subtle>
                        {item.category}
                      </Badge>
                    </div>

                    {item.tags.length > 0 ? (
                      <div className="tag-cloud">
                        {item.tags.map((tag) => (
                          <Badge key={`${item.id}-${tag}`} tone={config.tone} subtle>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="dataset-card__facts">
                      <span>
                        <Icon type="file" size={14} />
                        {item.fileName}
                      </span>
                      <span>
                        <Icon type="storage" size={14} />
                        {prettyBytes(item.fileSize)}
                      </span>
                    </div>

                    <div className="dataset-card__footer">
                      <span>{item.author}</span>
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                    <div className="dataset-card__actions">
                      <Button variant="secondary" className="preview-button" onClick={() => setPreviewAsset(item)}>
                        <Icon type="monitor" size={14} />
                        <span>在线预览</span>
                      </Button>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <SurfaceCard className="workspace-card">
            <div className="workspace-card__header">
              <div>
                <div className="section-eyebrow">Submit Resource</div>
                <h3>提交到 {config.label}</h3>
                <p>资源上传完成后，只要设置为公开，就会同步出现在当前资源中心和对应实验室页面。</p>
              </div>
              <Badge tone={config.tone} subtle>
                {progress}% 完成
              </Badge>
            </div>

            <form className="form-grid" onSubmit={handleSubmit}>
              <label className="field field--wide">
                <span>标题</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`请输入${config.label}条目标题`} />
              </label>

              <label className="field">
                <span>提交人</span>
                <input value={auth.user?.displayName || auth.user?.email || ""} readOnly placeholder="请先登录" />
              </label>

              <label className="field">
                <span>{config.categoryLabel}</span>
                <select value={submitCategory} onChange={(event) => setSubmitCategory(event.target.value)}>
                  {config.categories.slice(1).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>关联实验室</span>
                <select value={labKey} onChange={(event) => setLabKey(event.target.value)}>
                  <option value="">不指定</option>
                  {labs.map((lab) => (
                    <option key={lab.key} value={lab.key}>
                      {lab.shortLabel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>可见性</span>
                <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
                  <option value="public">公开</option>
                  <option value="lab">实验室内可见</option>
                  <option value="private">仅自己可见</option>
                </select>
              </label>

              {(config.extraFields || []).map((field) => (
                <label key={field.key} className="field">
                  <span>{field.label}</span>
                  {field.type === "select" ? (
                    <select value={extraValues[field.key]} onChange={(event) => updateExtraValue(field.key, event.target.value)}>
                      <option value="">请选择</option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={extraValues[field.key]}
                      onChange={(event) => updateExtraValue(field.key, event.target.value)}
                      placeholder={field.placeholder || ""}
                    />
                  )}
                </label>
              ))}

              <label className="field field--wide">
                <span>说明摘要</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="描述内容用途、适用范围、依赖环境或样本说明。"
                />
              </label>

              <label className="field field--wide">
                <span>上传文件</span>
                <div className="upload-dropzone">
                  <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
                  <div>
                    <Icon type="upload" size={28} color="#0b6aa8" />
                    <strong>选择需要归档的文件</strong>
                    <p>系统会走新的分片上传流程，并自动写入资源中心元数据。</p>
                  </div>
                </div>
                {files.length > 0 ? (
                  <div className="file-list">
                    {files.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="file-list__item">
                        <span>{file.name}</span>
                        <span>{prettyBytes(file.size)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </label>

              {!auth.authed ? <div className="form-note">当前未登录，提交前会先提示你登录平台。</div> : null}

              <div className="workspace-card__footer field--wide">
                <div className="progress-strip">
                  <div className="progress-strip__bar" style={{ width: `${progress}%` }} />
                </div>
                <div className="workspace-card__status">
                  <span>{status}</span>
                  <span>{files.length > 0 ? `${files.length} 个文件待归档` : "等待选择文件"}</span>
                </div>
                <Button type="submit" disabled={submitting || !title.trim() || files.length === 0}>
                  {submitting ? "提交中..." : "提交归档"}
                </Button>
              </div>
            </form>

            {logs.length > 0 ? (
              <div className="log-panel">
                {logs.map((item) => (
                  <div key={item} className="log-panel__row">
                    <Icon type="chevronRight" size={12} color="#0b6aa8" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>
        )}
      </PageSection>

      {previewAsset ? <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} /> : null}
    </>
  );
}
