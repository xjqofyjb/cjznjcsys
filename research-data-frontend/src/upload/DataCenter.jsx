import { useEffect, useMemo, useRef, useState } from "react";
import { labs } from "../labs/data";
import { EmptyState, LoadingState, MetricCard, PageSection, SurfaceCard, Button, Badge } from "../shared-ui/components";
import { Icon } from "../shared-ui/icons";
import { formatDateTime, prettyBytes } from "../shared-ui/formatters";
import { apiJson } from "./api";
import { uploadFileViaMultipart } from "./multipartUpload";

function UploadPanel({ auth }) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [labKey, setLabKey] = useState("");
  const [version, setVersion] = useState("v1");
  const [visibility, setVisibility] = useState("private");
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("等待上传");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const totalRef = useRef(0);
  const doneRef = useRef(0);

  function pushLog(message) {
    setLogs((current) => [message, ...current].slice(0, 12));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!labKey || !title.trim() || files.length === 0) return;

    setSubmitting(true);
    setStatus("准备上传");
    setLogs([]);
    setProgress(0);
    totalRef.current = files.reduce((sum, file) => sum + file.size, 0);
    doneRef.current = 0;

    try {
      for (const file of files) {
        pushLog(`开始上传 ${file.name}`);
        await uploadFileViaMultipart({
          file,
          title: title.trim(),
          description: summary.trim(),
          datasetKind: "data",
          versionLabel: version.trim() || "v1",
          labKey,
          visibility,
          metadata: {
            uploaderEmail: auth.user?.email ?? "",
            uploaderName: auth.user?.displayName ?? "",
          },
          onStatus: setStatus,
          onPart: (_part, _count, size) => {
            doneRef.current += size;
            setProgress(Math.min(100, Math.round((doneRef.current * 100) / Math.max(totalRef.current, 1))));
          },
        });
        pushLog(`已完成 ${file.name}`);
      }

      setProgress(100);
      setStatus("上传完成");
      setTitle("");
      setSummary("");
      setLabKey("");
      setVersion("v1");
      setVisibility("private");
      setFiles([]);
    } catch (error) {
      setStatus("上传失败");
      pushLog(error.message || "上传失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SurfaceCard className="workspace-card">
      <div className="workspace-card__header">
        <div>
          <div className="section-eyebrow">Upload Workbench</div>
          <h3>远程上传与归档</h3>
          <p>每个文件都会建立独立上传会话，完成后立即进入资产控制台，方便管理员监控与处理。</p>
        </div>
        <Badge tone="ocean" subtle>{progress}% 完成</Badge>
      </div>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field field--wide">
          <span>所属实验室</span>
          <div className="tile-picker">
            {labs.map((lab) => (
              <button
                key={lab.key}
                type="button"
                className={`tile-picker__item ${labKey === lab.key ? "is-active" : ""}`}
                onClick={() => setLabKey(lab.key)}
              >
                <Icon type={lab.iconType} size={18} />
                <span>{lab.shortLabel}</span>
              </button>
            ))}
          </div>
        </label>

        <label className="field field--wide">
          <span>标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：三峡航运数据 2026Q2" />
        </label>

        <label className="field field--wide">
          <span>摘要说明</span>
          <textarea rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="说明数据来源、时间范围、字段结构和使用边界。" />
        </label>

        <label className="field">
          <span>当前上传者</span>
          <input value={auth.user?.displayName || auth.user?.email || ""} readOnly />
        </label>

        <label className="field">
          <span>版本号</span>
          <input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="v1" />
        </label>

        <label className="field">
          <span>可见性</span>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="private">仅自己</option>
            <option value="lab">实验室内部</option>
            <option value="public">公开</option>
          </select>
        </label>

        <label className="field field--wide">
          <span>上传文件</span>
          <div className="upload-dropzone">
            <input type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} />
            <div>
              <Icon type="upload" size={28} color="#0b6aa8" />
              <strong>选择一个或多个文件上传</strong>
              <p>上传将直接走新的 `/api/v1/uploads/sessions` 分片流程。</p>
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

        <div className="workspace-card__footer field--wide">
          <div className="progress-strip">
            <div className="progress-strip__bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="workspace-card__status">
            <span>{status}</span>
            <span>{files.length > 0 ? `${files.length} 个文件待处理` : "等待选择文件"}</span>
          </div>
          <Button type="submit" disabled={submitting || !labKey || !title.trim() || files.length === 0}>
            {submitting ? "上传中..." : "开始上传"}
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
  );
}

function RecordsPanel() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const [assetsResult, sessionsResult] = await Promise.all([
          apiJson("/uploads/assets"),
          apiJson("/uploads/sessions"),
        ]);

        if (cancelled) return;

        const sessionsByAsset = new Map((sessionsResult?.items || []).map((item) => [item.asset_id, item]));
        setRecords(
          (assetsResult?.items || []).map((item) => ({
            ...item,
            session: sessionsByAsset.get(item.id) || null,
          })),
        );
      } catch {
        if (!cancelled) {
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((item) => {
      if (!query) return true;
      return `${item.title} ${item.file_name} ${item.lab_key || ""}`.toLowerCase().includes(query);
    });
  }, [records, search]);

  return (
    <SurfaceCard className="workspace-card">
      <div className="workspace-card__header">
        <div>
          <div className="section-eyebrow">My Records</div>
          <h3>我的上传记录</h3>
          <p>回看自己的资产、上传状态和版本信息，不再依赖旧的“我的数据”接口。</p>
        </div>
      </div>

      <div className="toolbar">
        <label className="toolbar__search">
          <Icon type="search" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、文件名或实验室" />
        </label>
      </div>

      {loading ? <LoadingState title="正在加载上传记录..." /> : null}
      {!loading && filtered.length === 0 ? <EmptyState iconType="folder" title="还没有找到记录" description="上传完成后，这里会自动出现你的资产和会话状态。" /> : null}
      {!loading && filtered.length > 0 ? (
        <div className="dataset-grid">
          {filtered.map((item) => (
            <SurfaceCard key={item.id} className="dataset-card">
              <div className="dataset-card__top">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.file_name}</p>
                </div>
                <Badge tone={item.visibility === "public" ? "aurora" : item.visibility === "lab" ? "copper" : "ocean"} subtle>
                  {item.visibility}
                </Badge>
              </div>
              <div className="dataset-card__facts">
                <span><Icon type="storage" size={14} />{prettyBytes(item.file_size)}</span>
                <span><Icon type="layers" size={14} />{item.version_label}</span>
                <span><Icon type="database" size={14} />{item.status}</span>
              </div>
              <div className="dataset-card__footer">
                <span>{formatDateTime(item.created_at)}</span>
                <span>{item.session?.state || "no-session"}</span>
              </div>
            </SurfaceCard>
          ))}
        </div>
      ) : null}
    </SurfaceCard>
  );
}

function defaultCreateUserForm() {
  return {
    displayName: "",
    email: "",
    password: "",
    role: "uploader",
    status: "active",
  };
}

function buildEditForm(user) {
  return {
    displayName: user?.display_name || "",
    role: user?.role || "uploader",
    status: user?.status || "active",
    password: "",
  };
}

function AdminUserCard({ user, actingId, editingUserId, editForm, onStartEdit, onCancelEdit, onChangeEdit, onSubmitEdit }) {
  const isEditing = editingUserId === user.id;

  return (
    <SurfaceCard className="dataset-card">
      <div className="dataset-card__top">
        <div>
          <h3>{user.display_name}</h3>
          <p>{user.email}</p>
        </div>
        <Badge tone={user.role === "admin" ? "copper" : user.role === "viewer" ? "aurora" : "ocean"} subtle>
          {user.role} · {user.status}
        </Badge>
      </div>

      <div className="dataset-card__facts">
        <span><Icon type="users" size={14} />{user.last_login_at ? `最近登录 ${formatDateTime(user.last_login_at)}` : "尚未登录"}</span>
        <span><Icon type="chart" size={14} />创建于 {formatDateTime(user.created_at)}</span>
      </div>

      {!isEditing ? (
        <div className="admin-asset-actions">
          <Button variant="secondary" disabled={actingId === user.id} onClick={() => onStartEdit(user)}>
            编辑账号
          </Button>
        </div>
      ) : (
        <form className="admin-user-form" onSubmit={(event) => onSubmitEdit(event, user.id)}>
          <label className="field">
            <span>显示名称</span>
            <input value={editForm.displayName} onChange={(event) => onChangeEdit("displayName", event.target.value)} />
          </label>

          <label className="field">
            <span>角色</span>
            <select value={editForm.role} onChange={(event) => onChangeEdit("role", event.target.value)}>
              <option value="admin">admin</option>
              <option value="uploader">uploader</option>
              <option value="viewer">viewer</option>
            </select>
          </label>

          <label className="field">
            <span>状态</span>
            <select value={editForm.status} onChange={(event) => onChangeEdit("status", event.target.value)}>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </label>

          <label className="field admin-user-form__password">
            <span>新密码</span>
            <input
              type="password"
              value={editForm.password}
              onChange={(event) => onChangeEdit("password", event.target.value)}
              placeholder="留空则不重置密码"
            />
          </label>

          <div className="admin-asset-actions">
            <Button type="submit" disabled={actingId === user.id}>
              {actingId === user.id ? "保存中..." : "保存变更"}
            </Button>
            <Button variant="ghost" onClick={onCancelEdit} disabled={actingId === user.id}>
              取消
            </Button>
          </div>
        </form>
      )}
    </SurfaceCard>
  );
}

function AdminPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState(defaultCreateUserForm);
  const [editingUserId, setEditingUserId] = useState("");
  const [editForm, setEditForm] = useState(buildEditForm(null));

  async function loadAdminData() {
    setLoading(true);
    setError("");

    try {
      const [dashboardResult, uploadsResult, assetsResult, usersResult, actionsResult] = await Promise.all([
        apiJson("/admin/dashboard"),
        apiJson("/admin/uploads"),
        apiJson("/admin/assets"),
        apiJson("/admin/users"),
        apiJson("/admin/actions"),
      ]);

      setDashboard(dashboardResult);
      setUploads(uploadsResult?.items || []);
      setAssets(assetsResult?.items || []);
      setUsers(usersResult?.items || []);
      setActions(actionsResult?.items || []);
    } catch (nextError) {
      setError(nextError.message || "管理员数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function handleAssetAction(assetId, action) {
    setActingId(assetId);
    setError("");

    try {
      await apiJson(`/admin/assets/${assetId}/${action}`, { method: "POST" });
      await loadAdminData();
    } catch (nextError) {
      setError(nextError.message || "资产操作失败");
    } finally {
      setActingId("");
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setActingId("create-user");
    setError("");

    try {
      await apiJson("/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      setCreateForm(defaultCreateUserForm());
      await loadAdminData();
    } catch (nextError) {
      setError(nextError.message || "创建账号失败");
    } finally {
      setActingId("");
    }
  }

  function startEditUser(user) {
    setEditingUserId(user.id);
    setEditForm(buildEditForm(user));
  }

  function cancelEditUser() {
    setEditingUserId("");
    setEditForm(buildEditForm(null));
  }

  async function handleUpdateUser(event, userId) {
    event.preventDefault();
    setActingId(userId);
    setError("");

    const payload = {
      displayName: editForm.displayName,
      role: editForm.role,
      status: editForm.status,
      ...(editForm.password.trim() ? { password: editForm.password } : {}),
    };

    try {
      await apiJson(`/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      cancelEditUser();
      await loadAdminData();
    } catch (nextError) {
      setError(nextError.message || "更新账号失败");
    } finally {
      setActingId("");
    }
  }

  const metrics = dashboard?.metrics || {};

  return (
    <div className="admin-workspace">
      {error ? <div className="form-note form-note--error">{error}</div> : null}

      <div className="metric-grid">
        <MetricCard value={metrics.totalAssets ?? 0} label="总资产" iconType="database" tone="ocean" />
        <MetricCard value={metrics.readyAssets ?? 0} label="已就绪" iconType="spark" tone="aurora" />
        <MetricCard value={metrics.processingAssets ?? 0} label="处理中" iconType="server" tone="copper" />
        <MetricCard value={metrics.activeSessions ?? 0} label="活跃会话" iconType="chart" tone="ocean" />
      </div>

      <div className="split-layout">
        <SurfaceCard className="workspace-card">
          <div className="workspace-card__header">
            <div>
              <div className="section-eyebrow">Live Uploads</div>
              <h3>最近上传</h3>
            </div>
            <Button variant="secondary" onClick={loadAdminData} disabled={loading}>
              {loading ? "刷新中..." : "刷新面板"}
            </Button>
          </div>
          {loading ? <LoadingState title="正在加载上传列表..." /> : null}
          {!loading && uploads.length === 0 ? <EmptyState title="暂无上传会话" description="新的上传会话会自动出现在这里。" /> : null}
          {!loading && uploads.length > 0 ? (
            <div className="list-stack">
              {uploads.slice(0, 6).map((item) => (
                <div key={item.id} className="list-stack__row">
                  <div>
                    <strong>{item.title}</strong>
                    <div className="topbar-menu__desc">{item.uploader_email} · {item.state}</div>
                  </div>
                  <span>{prettyBytes(item.uploaded_bytes)} / {prettyBytes(item.total_bytes)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </SurfaceCard>

        <SurfaceCard className="workspace-card">
          <div className="workspace-card__header">
            <div>
              <div className="section-eyebrow">User Provisioning</div>
              <h3>创建上传者或管理员</h3>
              <p>在这里快速创建新账号，统一纳入平台的会话与权限管理。</p>
            </div>
          </div>

          <form className="admin-user-form" onSubmit={handleCreateUser}>
            <label className="field">
              <span>显示名称</span>
              <input value={createForm.displayName} onChange={(event) => setCreateForm((current) => ({ ...current, displayName: event.target.value }))} />
            </label>

            <label className="field">
              <span>邮箱</span>
              <input type="email" value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} />
            </label>

            <label className="field">
              <span>初始密码</span>
              <input type="password" value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} />
            </label>

            <label className="field">
              <span>角色</span>
              <select value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}>
                <option value="admin">admin</option>
                <option value="uploader">uploader</option>
                <option value="viewer">viewer</option>
              </select>
            </label>

            <label className="field">
              <span>状态</span>
              <select value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>

            <div className="admin-asset-actions admin-asset-actions--align">
              <Button type="submit" disabled={actingId === "create-user"}>
                {actingId === "create-user" ? "创建中..." : "创建账号"}
              </Button>
            </div>
          </form>
        </SurfaceCard>
      </div>

      <PageSection eyebrow="Users" title="账号管理" subtitle="支持前端直接完成账号创建、角色调整、密码重置和停用操作。">
        {loading ? <LoadingState title="正在加载账号列表..." /> : null}
        {!loading && users.length === 0 ? <EmptyState title="暂无用户" description="创建上传者和管理员后会显示在这里。" /> : null}
        {!loading && users.length > 0 ? (
          <div className="dataset-grid">
            {users.map((item) => (
              <AdminUserCard
                key={item.id}
                user={item}
                actingId={actingId}
                editingUserId={editingUserId}
                editForm={editForm}
                onStartEdit={startEditUser}
                onCancelEdit={cancelEditUser}
                onChangeEdit={(key, value) => setEditForm((current) => ({ ...current, [key]: value }))}
                onSubmitEdit={handleUpdateUser}
              />
            ))}
          </div>
        ) : null}
      </PageSection>

      <PageSection eyebrow="Assets" title="资产控制台" subtitle="直接对资产执行归档、恢复和删除操作。">
        {loading ? <LoadingState title="正在加载资产..." /> : null}
        {!loading && assets.length === 0 ? <EmptyState title="暂无资产" description="上传后生成的资产会自动同步到这里。" /> : null}
        {!loading && assets.length > 0 ? (
          <div className="dataset-grid">
            {assets.slice(0, 8).map((item) => (
              <SurfaceCard key={item.id} className="dataset-card">
                <div className="dataset-card__top">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.owner_email}</p>
                  </div>
                  <Badge tone={item.status === "archived" ? "copper" : item.status === "ready" ? "aurora" : "ocean"} subtle>
                    {item.status}
                  </Badge>
                </div>
                <div className="dataset-card__facts">
                  <span><Icon type="file" size={14} />{item.file_name}</span>
                  <span><Icon type="storage" size={14} />{prettyBytes(item.file_size)}</span>
                  <span><Icon type="lab" size={14} />{item.lab_key || "未分组"}</span>
                </div>
                <div className="admin-asset-actions">
                  <Button variant="secondary" disabled={actingId === item.id || item.status === "archived"} onClick={() => handleAssetAction(item.id, "archive")}>归档</Button>
                  <Button variant="ghost" disabled={actingId === item.id || item.status !== "archived"} onClick={() => handleAssetAction(item.id, "restore")}>恢复</Button>
                  <Button variant="ghost" disabled={actingId === item.id || item.status === "deleted"} onClick={() => handleAssetAction(item.id, "delete")}>删除</Button>
                </div>
              </SurfaceCard>
            ))}
          </div>
        ) : null}
      </PageSection>

      <PageSection eyebrow="Audit Trail" title="最近管理员操作" subtitle="帮助你快速确认谁在什么时间处理了哪些资产。">
        {loading ? <LoadingState title="正在加载操作日志..." /> : null}
        {!loading && actions.length === 0 ? <EmptyState title="暂无操作记录" description="管理员动作会自动记录到这里。" /> : null}
        {!loading && actions.length > 0 ? (
          <div className="list-stack">
            {actions.slice(0, 10).map((item) => (
              <div key={item.id} className="list-stack__row">
                <div>
                  <strong>{item.action}</strong>
                  <div className="topbar-menu__desc">{item.admin_email} · {item.target_type} · {item.target_id}</div>
                </div>
                <span>{formatDateTime(item.created_at)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </PageSection>
    </div>
  );
}

export function DataCenter({ auth }) {
  const tabs = [
    { key: "upload", label: "上传归档" },
    { key: "records", label: "我的记录" },
    ...(auth.isAdmin ? [{ key: "admin", label: "管理员工作台" }] : []),
  ];
  const [tab, setTab] = useState(tabs[0]?.key || "upload");

  useEffect(() => {
    if (!tabs.some((item) => item.key === tab)) {
      setTab(tabs[0]?.key || "upload");
    }
  }, [tab, tabs]);

  return (
    <>
      <section className="hero-banner hero-banner--compact">
        <div className="hero-banner__copy">
          <Badge tone="ocean" subtle>Data Operations</Badge>
          <h1>把登录、上传与管理员监控整合成一套真正可用的研究数据工作台。</h1>
          <p>新的数据中心直接连到 Cloudflare 后端，上传者和管理员都在同一套产品流里工作，不再依赖演示接口。</p>
        </div>
      </section>

      <PageSection eyebrow="Workspace" title="数据中心" subtitle="围绕上传归档、个人记录和管理员监控，做成一体化的协同工作台。">
        <div className="toolbar toolbar--tabs">
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`toolbar-chip ${tab === item.key ? "is-active" : ""}`}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "upload" ? <UploadPanel auth={auth} /> : null}
        {tab === "records" ? <RecordsPanel /> : null}
        {tab === "admin" ? <AdminPanel /> : null}
      </PageSection>
    </>
  );
}
