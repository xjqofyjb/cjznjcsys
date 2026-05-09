import { useEffect, useMemo, useState } from "react";
import { apiJson } from "../upload/api";
import { Button, SurfaceCard } from "./components";
import { Icon } from "./icons";
import { prettyBytes } from "./formatters";

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function parseTablePreview(text, kind) {
  const delimiter = kind === "tsv" ? "\t" : ",";
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 12)
    .map((line) => splitDelimitedLine(line, delimiter).slice(0, 8));

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: rows[0],
    rows: rows.slice(1),
  };
}

function formatJsonPreview(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function PreviewBody({ payload }) {
  const preview = payload?.preview;

  const table = useMemo(() => {
    if (!preview || (preview.kind !== "csv" && preview.kind !== "tsv")) {
      return null;
    }

    return parseTablePreview(preview.text || "", preview.kind);
  }, [preview]);

  if (!preview) {
    return null;
  }

  if (preview.kind === "unsupported" || preview.kind === "missing") {
    return (
      <div className="asset-preview__unsupported">
        <Icon type="shield" size={26} />
        <h3>暂不支持在线预览</h3>
        <p>{preview.message || "该文件类型无法安全转换为网页预览，系统不会提供下载入口。"}</p>
      </div>
    );
  }

  if (table) {
    return (
      <div className="asset-preview__table-wrap">
        <table className="asset-preview__table">
          <thead>
            <tr>
              {table.headers.map((header, index) => (
                <th key={`${header}-${index}`}>{header || `列 ${index + 1}`}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {table.headers.map((_header, cellIndex) => (
                  <td key={cellIndex}>{row[cellIndex] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className="asset-preview__text">
      {preview.kind === "json" ? formatJsonPreview(preview.text || "") : preview.text || "暂无可预览内容"}
    </pre>
  );
}

export function AssetPreviewModal({ asset, onClose }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!asset?.id) {
      return undefined;
    }

    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      setError("");
      setPayload(null);

      try {
        const result = await apiJson(`/public/assets/${encodeURIComponent(asset.id)}/preview`);
        if (!cancelled) {
          setPayload(result);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || "预览加载失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [asset?.id]);

  if (!asset) {
    return null;
  }

  const displayAsset = payload?.asset || asset;
  const preview = payload?.preview;

  return (
    <div className="modal-backdrop asset-preview-backdrop" role="dialog" aria-modal="true">
      <SurfaceCard className="asset-preview">
        <div className="asset-preview__header">
          <div>
            <div className="section-eyebrow">Secure Preview</div>
            <h2>{displayAsset.title || asset.title || "资源预览"}</h2>
            <p>
              仅展示可安全渲染的前置预览内容，不开放原文件下载，不暴露存储地址。
            </p>
          </div>
          <button className="asset-preview__close" onClick={onClose} aria-label="关闭预览">
            <Icon type="close" size={18} />
          </button>
        </div>

        <div className="asset-preview__meta">
          <span>
            <Icon type="file" size={14} />
            {displayAsset.file_name || asset.fileName || asset.file_name || "未知文件"}
          </span>
          <span>
            <Icon type="storage" size={14} />
            {prettyBytes(displayAsset.file_size ?? asset.fileSize ?? asset.file_size)}
          </span>
          {preview?.truncated ? <strong>已截断预览</strong> : <strong>只读预览</strong>}
        </div>

        <div className="asset-preview__body">
          {loading ? (
            <div className="asset-preview__loading">
              <div className="loading-dot" />
              <span>正在生成预览...</span>
            </div>
          ) : null}
          {!loading && error ? (
            <div className="asset-preview__unsupported">
              <Icon type="shield" size={26} />
              <h3>预览加载失败</h3>
              <p>{error}</p>
            </div>
          ) : null}
          {!loading && !error ? <PreviewBody payload={payload} /> : null}
        </div>

        {preview?.message ? <div className="asset-preview__note">{preview.message}</div> : null}

        <div className="asset-preview__actions">
          <Button variant="secondary" onClick={onClose}>
            关闭
          </Button>
        </div>
      </SurfaceCard>
    </div>
  );
}
