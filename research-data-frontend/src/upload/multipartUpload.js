import { apiFetch, apiJson } from "./api";

export const CHUNK_SIZE = 8 * 1024 * 1024;

export async function createUploadSession(input) {
  return apiJson("/uploads/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function uploadPartViaApi(sessionId, partNumber, blob) {
  const response = await apiFetch(`/uploads/sessions/${sessionId}/parts/${partNumber}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: blob,
  });

  return response.json();
}

export async function completeUploadSession(sessionId) {
  return apiJson(`/uploads/sessions/${sessionId}/complete`, {
    method: "POST",
  });
}

export async function uploadFileViaMultipart({
  file,
  title,
  description,
  datasetKind,
  versionLabel,
  labKey,
  visibility = "private",
  metadata,
  onPart,
  onStatus,
}) {
  onStatus?.(`初始化上传：${file.name}`);

  const session = await createUploadSession({
    title,
    description,
    datasetKind,
    fileName: file.name,
    fileSize: file.size,
    contentType: file.type || "application/octet-stream",
    labKey,
    versionLabel,
    visibility,
    metadata,
  });

  const partCount = Math.ceil(file.size / CHUNK_SIZE) || 1;

  for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
    const start = (partNumber - 1) * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);
    onStatus?.(`上传分片 ${partNumber}/${partCount}`);
    await uploadPartViaApi(session.sessionId, partNumber, blob);
    onPart?.(partNumber, partCount, blob.size);
  }

  onStatus?.(`完成上传：${file.name}`);
  const completed = await completeUploadSession(session.sessionId);

  return {
    ...completed,
    name: file.name,
    size: file.size,
    sessionId: session.sessionId,
  };
}
