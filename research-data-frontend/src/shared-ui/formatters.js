export function prettyBytes(value) {
  if (value == null || Number.isNaN(value)) return "-";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value;
  let index = 0;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }

  return `${current.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function toUploadPrefix(datasetId, version, title) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTitle = (title.trim() || "untitled")
    .replace(/[^\w\-\u4e00-\u9fa5]+/g, "_")
    .slice(0, 60);

  return `${datasetId}/${version}/${stamp}_${safeTitle}`;
}
