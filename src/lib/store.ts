import { seedStore } from "@/lib/seed";
import fs from "node:fs";
import path from "node:path";

import {
  Activity,
  AppStore,
  UploadPartRecord,
  UploadSession,
  User,
  Vote,
  Work,
  WorkStatus
} from "@/lib/types";
import { inferMediaTypeFromMime, UPLOAD_PART_SIZE, validateUploadFile } from "@/lib/upload-limits";

declare global {
  // eslint-disable-next-line no-var
  var __vivoPicVoteStore: AppStore | undefined;
}

function cloneSeed() {
  const dataFile = path.join(process.cwd(), "data", "store.json");
  try {
    if (fs.existsSync(dataFile)) {
      const persisted = JSON.parse(fs.readFileSync(dataFile, "utf8")) as AppStore;
      return {
        ...persisted,
        uploadSessions: persisted.uploadSessions ?? []
      };
    }
  } catch {
    // Fall back to seed data if the local dev snapshot is unavailable.
  }
  return JSON.parse(JSON.stringify(seedStore)) as AppStore;
}

function getStore(): AppStore {
  if (!global.__vivoPicVoteStore) {
    global.__vivoPicVoteStore = cloneSeed();
  }
  return global.__vivoPicVoteStore;
}

function timestamp() {
  return new Date().toISOString();
}

function persistStore() {
  if (process.env.VIVOPICVOTE_DISABLE_FILE_STORE === "1") {
    return;
  }
  try {
    const dataDir = path.join(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, "store.json"), JSON.stringify(getStore(), null, 2));
  } catch {
    // Persistence is best-effort for the local fallback store.
  }
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function quotaForUser(user: User, activity: Activity) {
  return user.voteQuota ?? activity.defaultVoteQuota;
}

export function listUsers(): User[] {
  return getStore().users;
}

export function listWorks(includeHidden = false): Work[] {
  const works = getStore().works.filter((work) =>
    includeHidden ? work.status !== "deleted" : work.status === "active"
  );
  return [...works].sort((a, b) => {
    if (b.voteCountCache !== a.voteCountCache) {
      return b.voteCountCache - a.voteCountCache;
    }
    return a.code.localeCompare(b.code);
  });
}

export function listAllWorks(): Work[] {
  return [...getStore().works].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listRecentWorks(): Work[] {
  return getStore().works
    .filter((work) => work.status === "active")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getActivity(): Activity {
  return getStore().activity;
}

export function getUserById(userId: string): User | null {
  return getStore().users.find((user) => user.id === userId) ?? null;
}

export function getUserByEmployeeNo(employeeNo: string): User | null {
  return getStore().users.find((user) => user.employeeNo === employeeNo) ?? null;
}

export function authenticate(employeeNo: string, accessCode: string): User | null {
  const user = getUserByEmployeeNo(employeeNo);
  if (!user || user.accessCode !== accessCode) {
    return null;
  }
  return user;
}

export function getWorkById(workId: string): Work | null {
  return getStore().works.find((work) => work.id === workId) ?? null;
}

export function getWorkByCode(code: string): Work | null {
  return getStore().works.find((work) => work.code === code) ?? null;
}

export function getWorkForUser(userId: string): Work | null {
  return (
    getStore().works.find(
      (work) => work.ownerUserId === userId && (work.status === "active" || work.status === "hidden")
    ) ?? null
  );
}

export function remainingVotesForUser(userId: string): number {
  const store = getStore();
  const user = getUserById(userId);
  if (!user) {
    return 0;
  }
  const spent = store.votes
    .filter((vote) => vote.voterUserId === userId && vote.status === "valid")
    .reduce((sum, vote) => sum + vote.count, 0);
  return Math.max(0, quotaForUser(user, store.activity) - spent);
}

function updateWorkVoteCache(workId: string) {
  const store = getStore();
  const work = getWorkById(workId);
  if (!work) {
    return;
  }
  work.voteCountCache = store.votes
    .filter((vote) => vote.workId === workId && vote.status === "valid")
    .reduce((sum, vote) => sum + vote.count, 0);
}

function nextWorkCode() {
  const count = getStore().works.length + 1;
  return `A${String(count).padStart(3, "0")}`;
}

export function createWork(input: {
  owner: User;
  title: string;
  mediaType: Work["mediaType"];
  mediaUrl: string;
  previewUrl: string;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
}) {
  const store = getStore();
  if (!input.owner.canUpload) {
    throw new Error("当前账号没有上传权限");
  }
  if (!["uploading", "voting"].includes(store.activity.status)) {
    throw new Error("当前活动阶段不可上传");
  }
  if (getWorkForUser(input.owner.id)) {
    throw new Error("请先删除当前作品再重新上传");
  }

  const now = timestamp();
  const work: Work = {
    id: createId("work"),
    activityId: store.activity.id,
    ownerUserId: input.owner.id,
    ownerEmployeeNo: input.owner.employeeNo,
    ownerDisplayName: input.owner.displayName,
    code: nextWorkCode(),
    title: input.title.trim() || `${input.owner.displayName} 的作品`,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    previewUrl: input.previewUrl,
    mimeType: input.mimeType,
    originalFileName: input.originalFileName,
    sizeBytes: input.sizeBytes,
    status: "active",
    voteCountCache: 0,
    sharePath: "",
    createdAt: now,
    deletedAt: null
  };
  work.sharePath = `/share/${work.code}`;
  store.works.push(work);
  store.auditLogs.push({
    id: createId("log"),
    actorUserId: input.owner.id,
    action: "work.created",
    targetType: "work",
    targetId: work.id,
    payloadJson: JSON.stringify({ code: work.code, mediaType: work.mediaType }),
    createdAt: now
  });
  persistStore();
  return work;
}

function voidVotesForWork(workId: string, reason: string) {
  const store = getStore();
  for (const vote of store.votes) {
    if (vote.workId === workId && vote.status === "valid") {
      vote.status = "void";
      vote.reason = reason;
    }
  }
}

export function deleteWork(input: { actor: User; workId: string; asAdmin?: boolean }) {
  const store = getStore();
  const work = getWorkById(input.workId);
  if (!work) {
    throw new Error("作品不存在");
  }
  const canDelete = input.asAdmin ? input.actor.role === "admin" : work.ownerUserId === input.actor.id;
  if (!canDelete) {
    throw new Error("没有删除该作品的权限");
  }

  work.status = "deleted";
  work.deletedAt = timestamp();
  voidVotesForWork(work.id, input.asAdmin ? "admin_deleted" : "user_deleted");
  updateWorkVoteCache(work.id);
  store.auditLogs.push({
    id: createId("log"),
    actorUserId: input.actor.id,
    action: input.asAdmin ? "work.deleted_by_admin" : "work.deleted_by_owner",
    targetType: "work",
    targetId: work.id,
    payloadJson: JSON.stringify({ code: work.code }),
    createdAt: timestamp()
  });
  persistStore();
  return work;
}

export function castVotes(input: { voter: User; workId: string; count: number }) {
  const store = getStore();
  const work = getWorkById(input.workId);
  if (!work || work.status !== "active") {
    throw new Error("作品不可投票");
  }
  if (!input.voter.canVote) {
    throw new Error("当前账号没有投票权限");
  }
  if (store.activity.status !== "voting") {
    throw new Error("当前不在投票阶段");
  }
  if (input.count < 1) {
    throw new Error("至少投 1 票");
  }
  if (!store.activity.allowSelfVote && work.ownerUserId === input.voter.id) {
    throw new Error("当前活动不允许给自己的作品投票");
  }
  const remaining = remainingVotesForUser(input.voter.id);
  if (remaining < input.count) {
    throw new Error("剩余票数不足");
  }

  const vote: Vote = {
    id: createId("vote"),
    activityId: store.activity.id,
    voterUserId: input.voter.id,
    voterEmployeeNo: input.voter.employeeNo,
    workId: work.id,
    workCode: work.code,
    count: input.count,
    status: "valid",
    reason: null,
    createdAt: timestamp()
  };
  store.votes.push(vote);
  updateWorkVoteCache(work.id);
  store.auditLogs.push({
    id: createId("log"),
    actorUserId: input.voter.id,
    action: "vote.cast",
    targetType: "work",
    targetId: work.id,
    payloadJson: JSON.stringify({ workCode: work.code, count: input.count }),
    createdAt: timestamp()
  });
  persistStore();
  return { vote, remainingVotes: remainingVotesForUser(input.voter.id), work: getWorkById(work.id)! };
}

export function listVotesForUser(userId: string): Vote[] {
  return getStore().votes
    .filter((vote) => vote.voterUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listVotes(): Vote[] {
  return [...getStore().votes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateUserConfig(
  userId: string,
  patch: Partial<Pick<User, "canUpload" | "canVote" | "voteQuota" | "displayName" | "role">>
) {
  const user = getUserById(userId);
  if (!user) {
    throw new Error("用户不存在");
  }
  Object.assign(user, patch, { updatedAt: timestamp() });
  persistStore();
  return user;
}

export function createUser(input: {
  employeeNo: string;
  displayName: string;
  role?: User["role"];
  accessCode?: string;
  canUpload?: boolean;
  canVote?: boolean;
  voteQuota?: number | null;
}) {
  if (getUserByEmployeeNo(input.employeeNo)) {
    throw new Error("工号已存在");
  }
  const user: User = {
    id: createId("user"),
    employeeNo: input.employeeNo,
    displayName: input.displayName,
    role: input.role ?? "participant",
    accessCode: input.accessCode ?? "demo123",
    canUpload: input.canUpload ?? true,
    canVote: input.canVote ?? true,
    voteQuota: input.voteQuota ?? null,
    createdAt: timestamp(),
    updatedAt: timestamp()
  };
  getStore().users.push(user);
  persistStore();
  return user;
}

export function updateWorkStatus(workId: string, status: WorkStatus) {
  const work = getWorkById(workId);
  if (!work) {
    throw new Error("作品不存在");
  }
  work.status = status;
  if (status !== "active") {
    voidVotesForWork(work.id, `status_${status}`);
  }
  updateWorkVoteCache(work.id);
  persistStore();
  return work;
}

export function updateActivityConfig(patch: Partial<Activity>) {
  const activity = getStore().activity;
  Object.assign(activity, patch, { updatedAt: timestamp() });
  persistStore();
  return activity;
}

export function getAdminSummary() {
  const store = getStore();
  const activeWorks = store.works.filter((work) => work.status === "active");
  const validVotes = store.votes.filter((vote) => vote.status === "valid");
  const voters = new Set(validVotes.map((vote) => vote.voterUserId));
  return {
    activity: store.activity,
    worksCount: activeWorks.length,
    totalVotes: validVotes.reduce((sum, vote) => sum + vote.count, 0),
    votersCount: voters.size,
    hiddenWorksCount: store.works.filter((work) => work.status === "hidden").length,
    deletedWorksCount: store.works.filter((work) => work.status === "deleted").length,
    ranking: listWorks(false).slice(0, 5)
  };
}

export function exportSnapshot(): AppStore {
  return getStore();
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-()\u4e00-\u9fa5]+/g, "_").slice(0, 120) || "upload.bin";
}

function extensionFromName(fileName: string) {
  return sanitizeFileName(fileName).split(".").pop()?.toLowerCase() || "bin";
}

export function listUploadSessionsForUser(userId: string): UploadSession[] {
  return getStore().uploadSessions
    .filter((session) => session.ownerUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getUploadSession(uploadId: string): UploadSession | null {
  return getStore().uploadSessions.find((session) => session.id === uploadId) ?? null;
}

export function createUploadSession(input: {
  owner: User;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const store = getStore();
  validateUploadFile({ mimeType: input.mimeType, sizeBytes: input.sizeBytes });
  if (!input.owner.canUpload) {
    throw new Error("当前账号没有上传权限");
  }
  if (!["uploading", "voting"].includes(store.activity.status)) {
    throw new Error("当前活动阶段不可上传");
  }
  if (getWorkForUser(input.owner.id)) {
    throw new Error("请先删除当前作品再重新上传");
  }

  const now = timestamp();
  const workDraftId = createId("draft");
  const ext = extensionFromName(input.fileName);
  const session: UploadSession = {
    id: createId("upload"),
    workDraftId,
    activityId: store.activity.id,
    ownerUserId: input.owner.id,
    objectKey: `activities/${store.activity.id}/works/${workDraftId}/original.${ext}`,
    fileName: sanitizeFileName(input.fileName),
    title: input.title.trim(),
    mediaType: inferMediaTypeFromMime(input.mimeType),
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    partSize: UPLOAD_PART_SIZE,
    totalParts: Math.ceil(input.sizeBytes / UPLOAD_PART_SIZE),
    parts: [],
    status: "pending",
    error: null,
    resultWorkId: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
  };
  store.uploadSessions.push(session);
  persistStore();
  return session;
}

export function recordUploadPart(input: {
  actor: User;
  uploadId: string;
  partNumber: number;
  etag: string;
  sizeBytes: number;
}) {
  const session = getUploadSession(input.uploadId);
  if (!session || session.ownerUserId !== input.actor.id) {
    throw new Error("上传会话不存在");
  }
  if (session.status === "completed" || session.status === "aborted") {
    throw new Error("上传会话已结束");
  }
  if (input.partNumber < 1 || input.partNumber > session.totalParts) {
    throw new Error("分片编号无效");
  }

  const now = timestamp();
  const nextPart: UploadPartRecord = {
    partNumber: input.partNumber,
    etag: input.etag,
    sizeBytes: input.sizeBytes,
    uploadedAt: now
  };
  session.parts = [...session.parts.filter((part) => part.partNumber !== input.partNumber), nextPart].sort(
    (a, b) => a.partNumber - b.partNumber
  );
  session.status = "uploading";
  session.updatedAt = now;
  session.error = null;
  persistStore();
  return session;
}

export function failUploadSession(uploadId: string, error: string) {
  const session = getUploadSession(uploadId);
  if (!session) {
    return null;
  }
  session.status = "failed";
  session.error = error;
  session.updatedAt = timestamp();
  persistStore();
  return session;
}

export function abortUploadSession(input: { actor: User; uploadId: string }) {
  const session = getUploadSession(input.uploadId);
  if (!session || session.ownerUserId !== input.actor.id) {
    throw new Error("上传会话不存在");
  }
  session.status = "aborted";
  session.updatedAt = timestamp();
  persistStore();
  return session;
}

export function completeUploadSession(input: {
  actor: User;
  uploadId: string;
  mediaUrl: string;
  previewUrl: string;
  parts?: UploadPartRecord[];
}) {
  const session = getUploadSession(input.uploadId);
  if (!session || session.ownerUserId !== input.actor.id) {
    throw new Error("上传会话不存在");
  }
  if (session.status === "completed") {
    const existing = session.resultWorkId ? getWorkById(session.resultWorkId) : null;
    if (existing) {
      return { session, work: existing };
    }
    throw new Error("上传会话已完成但作品不存在");
  }
  if (session.status === "aborted") {
    throw new Error("上传已取消");
  }

  const parts = input.parts?.length ? input.parts : session.parts;
  if (parts.length !== session.totalParts) {
    throw new Error("上传分片尚未完整");
  }

  const work = createWork({
    owner: input.actor,
    title: session.title,
    mediaType: session.mediaType,
    mediaUrl: input.mediaUrl,
    previewUrl: input.previewUrl,
    mimeType: session.mimeType,
    originalFileName: session.fileName,
    sizeBytes: session.sizeBytes
  });
  session.status = "completed";
  session.resultWorkId = work.id;
  session.updatedAt = timestamp();
  persistStore();
  return { session, work };
}
