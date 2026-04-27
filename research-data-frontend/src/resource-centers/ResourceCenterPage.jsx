import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, EmptyState, MetricCard, PageSection, SurfaceCard } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { formatDateTime, prettyBytes, toUploadPrefix } from "../shared-ui/formatters";
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

export function ResourceCenterPage({ config, auth, onRequireAuth }) {
  const [view, setView] = useState("overview");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("全部");
  const [submitCategory, setSubmitCategory] = useState(config.categories[1] || config.categories[0] || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploader, setUploader] = useState(auth.user || "");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("等待上传");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [extraValues, setExtraValues] = useState(() =>
    Object.fromEntries((config.extraFields || []).map((field) => [field.key, ""])),
  );
  const totalRef = useRef(0);
  const doneRef = useRef(0);

  useEffect(() => {
    if (auth.user) {
      setUploader((current) => current || auth.user);
    }
  }, [auth.user]);

  const filteredItems = useMemo(
    () =>
      config.sampleItems.filter((item) => {
        const matchesCategory = filterCategory === "全部" || item.category === filterCategory;
        const haystack = `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase();
        return matchesCategory && haystack.includes(search.trim().toLowerCase());
      }),
    [filterCategory, config.sampleItems, search],
  );

  const prefix = useMemo(
    () => toUploadPrefix(config.datasetId, config.version, title),
    [config.datasetId, config.version, title],
  );

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

    if (!title.trim() || !uploader.trim() || files.length === 0) return;

    setSubmitting(true);
    setStatus("开始上传");
    setLogs([]);
    setProgress(0);
    totalRef.current = files.reduce((sum, file) => sum + file.size, 0);
    doneRef.current = 0;

    try {
      const uploadedFiles = [];

      for (const file of files) {
        pushLog(`上传 ${file.name}`);
        const result = await uploadFileViaMultipart({
          file,
          prefix,
          datasetId: config.datasetId,
          version: config.version,
          title: title.trim(),
          onStatus: setStatus,
          onPart: (_part, _count, size) => {
            doneRef.current += size;
            setProgress(Math.round((doneRef.current * 100) / Math.max(totalRef.current, 1)));
          },
        });
        uploadedFiles.push(result);
      }

      const metadata = {
        centerKey: config.key,
        centerLabel: config.label,
        title: title.trim(),
        description: description.trim(),
        uploader: uploader.trim(),
        category: submitCategory,
        extraValues,
        createdAt: new Date().toISOString(),
        files: uploadedFiles,
      };

      const metadataFile = new File([JSON.stringify(metadata, null, 2)], "metadata.json", { type: "application/json" });
      await uploadFileViaMultipart({
        file: metadataFile,
        prefix,
        datasetId: config.datasetId,
        version: config.version,
        title: title.trim(),
        noPrefix: true,
        onStatus: setStatus,
      });

      setStatus("上传完成");
      setProgress(100);
      pushLog("资源与元数据已归档");
      setTitle("");
      setDescription("");
      setFiles([]);
      setExtraValues(Object.fromEntries((config.extraFields || []).map((field) => [field.key, ""])));
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
        subtitle="把内容展示和提交入口统一成同一种产品语言。"
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

            {filteredItems.length === 0 ? (
              <EmptyState iconType={config.iconType} title="没有匹配结果" description="换个关键词，或者切换上方分类试试看。" />
            ) : (
              <div className="dataset-grid">
                {filteredItems.map((item) => (
                  <SurfaceCard key={item.title} className="dataset-card">
                    <div className="dataset-card__top">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.summary}</p>
                      </div>
                      <Badge tone={config.tone} subtle>
                        {item.category}
                      </Badge>
                    </div>

                    <div className="tag-cloud">
                      {item.tags.map((tag) => (
                        <Badge key={tag} tone={config.tone} subtle>
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="dataset-card__footer">
                      <span>{item.author}</span>
                      <span>{formatDateTime(item.updatedAt)}</span>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            )}
          </>
        ) : (
          <SurfaceCard className="workspace-card">
            <div className="workspace-card__header">
              <div>
                <div className="section-eyebrow">Submit Resource</div>
                <h3>提交到 {config.label}</h3>
                <p>复用统一上传能力，但保留每个中心自己的字段和语义。</p>
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
                <input value={uploader} onChange={(event) => setUploader(event.target.value)} placeholder="填写姓名或团队" />
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
                    <p>统一前缀：{prefix}</p>
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
                <Button type="submit" disabled={submitting || !title.trim() || !uploader.trim() || files.length === 0}>
                  {submitting ? "提交中…" : "提交归档"}
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
    </>
  );
}
