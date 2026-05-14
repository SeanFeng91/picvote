import { seedStore } from "@/lib/seed";
import fs from "node:fs";
import path from "node:path";

import { getD1Database } from "@/lib/cloudflare";
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

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseLike = {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
};

type SqliteRow = Record<string, unknown>;

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
        uploadSessions: (persisted.uploadSessions ?? []).map((session) => ({
          ...session,
          storageUploadId: session.storageUploadId ?? null
        }))
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

async function getD1() {
  return (await getD1Database()) as D1DatabaseLike | null;
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
  return `${prefix}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)}`;
}

function quotaForUser(user: User, activity: Activity) {
  return user.voteQuota ?? activity.defaultVoteQuota;
}

function toBool(value: unknown) {
  return value === true || value === 1;
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : Number(value ?? fallback);
}

function activityFromRow(row: SqliteRow): Activity {
  return {
    id: String(row.id),
    name: String(row.name),
    status: row.status as Activity["status"],
    defaultVoteQuota: toNumber(row.default_vote_quota),
    allowSelfVote: toBool(row.allow_self_vote),
    showPublicVotes: toBool(row.show_public_votes),
    uploadEndsAt: row.upload_ends_at ? String(row.upload_ends_at) : null,
    voteEndsAt: row.vote_ends_at ? String(row.vote_ends_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function userFromRow(row: SqliteRow): User {
  return {
    id: String(row.id),
    employeeNo: String(row.employee_no),
    displayName: String(row.display_name),
    role: row.role as User["role"],
    canUpload: toBool(row.can_upload),
    canVote: toBool(row.can_vote),
    voteQuota: row.vote_quota === null || row.vote_quota === undefined ? null : toNumber(row.vote_quota),
    accessCode: String(row.password_hash),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

function workFromRow(row: SqliteRow): Work {
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    ownerUserId: String(row.owner_user_id),
    ownerEmployeeNo: String(row.owner_employee_no),
    ownerDisplayName: String(row.owner_display_name),
    code: String(row.code),
    title: String(row.title),
    mediaType: row.media_type as Work["mediaType"],
    mediaUrl: String(row.media_url),
    previewUrl: String(row.preview_url),
    mimeType: String(row.mime_type),
    originalFileName: String(row.original_file_name),
    sizeBytes: toNumber(row.size_bytes),
    status: row.status as Work["status"],
    voteCountCache: toNumber(row.vote_count_cache),
    sharePath: String(row.share_path),
    createdAt: String(row.created_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null
  };
}

function voteFromRow(row: SqliteRow): Vote {
  return {
    id: String(row.id),
    activityId: String(row.activity_id),
    voterUserId: String(row.voter_user_id),
    voterEmployeeNo: String(row.voter_employee_no),
    workId: String(row.work_id),
    workCode: String(row.work_code),
    count: toNumber(row.count),
    status: row.status as Vote["status"],
    reason: row.reason ? String(row.reason) : null,
    createdAt: String(row.created_at)
  };
}

function uploadSessionFromRow(row: SqliteRow): UploadSession {
  return {
    id: String(row.id),
    workDraftId: String(row.work_draft_id),
    activityId: String(row.activity_id),
    ownerUserId: String(row.owner_user_id),
    objectKey: String(row.object_key),
    storageUploadId: row.storage_upload_id ? String(row.storage_upload_id) : null,
    fileName: String(row.file_name),
    title: String(row.title),
    mediaType: row.media_type as UploadSession["mediaType"],
    mimeType: String(row.mime_type),
    sizeBytes: toNumber(row.size_bytes),
    partSize: toNumber(row.part_size),
    totalParts: toNumber(row.total_parts),
    parts: JSON.parse(String(row.parts_json || "[]")) as UploadPartRecord[],
    status: row.status as UploadSession["status"],
    error: row.error ? String(row.error) : null,
    resultWorkId: row.result_work_id ? String(row.result_work_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    expiresAt: String(row.expires_at)
  };
}

async function queryAll<T>(sql: string, ...values: unknown[]) {
  const db = await getD1();
  if (!db) {
    return null;
  }
  await seedD1IfEmpty(db);
  const result = await db.prepare(sql).bind(...values).all<T>();
  return result.results ?? [];
}

async function queryFirst<T>(sql: string, ...values: unknown[]) {
  const db = await getD1();
  if (!db) {
    return null;
  }
  await seedD1IfEmpty(db);
  return db.prepare(sql).bind(...values).first<T>();
}

async function seedD1IfEmpty(db: D1DatabaseLike) {
  const statements: D1PreparedStatement[] = [];
  statements.push(
    db
      .prepare(
        "INSERT OR IGNORE INTO activities (id, name, status, default_vote_quota, allow_self_vote, show_public_votes, upload_ends_at, vote_ends_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        seedStore.activity.id,
        seedStore.activity.name,
        seedStore.activity.status,
        seedStore.activity.defaultVoteQuota,
        seedStore.activity.allowSelfVote ? 1 : 0,
        seedStore.activity.showPublicVotes ? 1 : 0,
        seedStore.activity.uploadEndsAt,
        seedStore.activity.voteEndsAt,
        seedStore.activity.createdAt,
        seedStore.activity.updatedAt
      )
  );
  for (const user of seedStore.users) {
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO users (id, employee_no, display_name, role, can_upload, can_vote, vote_quota, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          user.id,
          user.employeeNo,
          user.displayName,
          user.role,
          user.canUpload ? 1 : 0,
          user.canVote ? 1 : 0,
          user.voteQuota,
          user.accessCode,
          user.createdAt,
          user.updatedAt
        )
    );
  }
  await db.batch(statements);
}

async function withD1<T>(operation: (db: D1DatabaseLike) => Promise<T>) {
  const db = await getD1();
  if (!db) {
    return null;
  }
  await seedD1IfEmpty(db);
  return operation(db);
}

async function insertAuditLog(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  payload: unknown;
}) {
  const db = await getD1();
  if (!db) {
    const store = getStore();
    store.auditLogs.push({
      id: createId("log"),
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      payloadJson: JSON.stringify(input.payload),
      createdAt: timestamp()
    });
    return;
  }
  await db
    .prepare(
      "INSERT INTO audit_logs (id, actor_user_id, action, target_type, target_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      createId("log"),
      input.actorUserId,
      input.action,
      input.targetType,
      input.targetId,
      JSON.stringify(input.payload),
      timestamp()
    )
    .run();
}

async function refreshD1WorkVoteCache(db: D1DatabaseLike, workId: string) {
  await db
    .prepare(
      "UPDATE works SET vote_count_cache = COALESCE((SELECT SUM(count) FROM votes WHERE work_id = ? AND status = 'valid'), 0) WHERE id = ?"
    )
    .bind(workId, workId)
    .run();
}

async function voidD1VotesForWork(db: D1DatabaseLike, workId: string, reason: string) {
  await db.prepare("UPDATE votes SET status = 'void', reason = ? WHERE work_id = ? AND status = 'valid'").bind(reason, workId).run();
}

export async function listUsers(): Promise<User[]> {
  const rows = await queryAll<SqliteRow>("SELECT * FROM users ORDER BY employee_no ASC");
  if (rows) {
    return rows.map(userFromRow);
  }
  return getStore().users;
}

export async function listWorks(includeHidden = false): Promise<Work[]> {
  const rows = await queryAll<SqliteRow>(
    includeHidden
      ? "SELECT * FROM works WHERE status != 'deleted' ORDER BY vote_count_cache DESC, code ASC"
      : "SELECT * FROM works WHERE status = 'active' ORDER BY vote_count_cache DESC, code ASC"
  );
  if (rows) {
    return rows.map(workFromRow);
  }
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

export async function listAllWorks(): Promise<Work[]> {
  const rows = await queryAll<SqliteRow>("SELECT * FROM works ORDER BY created_at DESC");
  if (rows) {
    return rows.map(workFromRow);
  }
  return [...getStore().works].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRecentWorks(): Promise<Work[]> {
  const rows = await queryAll<SqliteRow>("SELECT * FROM works WHERE status = 'active' ORDER BY created_at DESC");
  if (rows) {
    return rows.map(workFromRow);
  }
  return getStore().works
    .filter((work) => work.status === "active")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getActivity(): Promise<Activity> {
  const activity = await withD1(async (db) => {
    const row = await db.prepare("SELECT * FROM activities LIMIT 1").first<SqliteRow>();
    return row ? activityFromRow(row) : null;
  });
  if (activity) {
    return activity;
  }
  return getStore().activity;
}

export async function getUserById(userId: string): Promise<User | null> {
  const row = await queryFirst<SqliteRow>("SELECT * FROM users WHERE id = ?", userId);
  if (row) {
    return userFromRow(row);
  }
  if (row === null && (await getD1())) {
    return null;
  }
  return getStore().users.find((user) => user.id === userId) ?? null;
}

export async function getUserByEmployeeNo(employeeNo: string): Promise<User | null> {
  const row = await queryFirst<SqliteRow>("SELECT * FROM users WHERE employee_no = ?", employeeNo);
  if (row) {
    return userFromRow(row);
  }
  if (row === null && (await getD1())) {
    return null;
  }
  return getStore().users.find((user) => user.employeeNo === employeeNo) ?? null;
}

export async function authenticate(employeeNo: string, accessCode: string): Promise<User | null> {
  const user = await getUserByEmployeeNo(employeeNo);
  if (!user || user.accessCode !== accessCode) {
    return null;
  }
  return user;
}

export async function getWorkById(workId: string): Promise<Work | null> {
  const row = await queryFirst<SqliteRow>("SELECT * FROM works WHERE id = ?", workId);
  if (row) {
    return workFromRow(row);
  }
  if (row === null && (await getD1())) {
    return null;
  }
  return getStore().works.find((work) => work.id === workId) ?? null;
}

export async function getWorkByCode(code: string): Promise<Work | null> {
  const row = await queryFirst<SqliteRow>("SELECT * FROM works WHERE code = ?", code);
  if (row) {
    return workFromRow(row);
  }
  if (row === null && (await getD1())) {
    return null;
  }
  return getStore().works.find((work) => work.code === code) ?? null;
}

export async function getWorkForUser(userId: string): Promise<Work | null> {
  const row = await queryFirst<SqliteRow>(
    "SELECT * FROM works WHERE owner_user_id = ? AND status IN ('active', 'hidden') ORDER BY created_at DESC LIMIT 1",
    userId
  );
  if (row) {
    return workFromRow(row);
  }
  if (row === null && (await getD1())) {
    return null;
  }
  return (
    getStore().works.find(
      (work) => work.ownerUserId === userId && (work.status === "active" || work.status === "hidden")
    ) ?? null
  );
}

export async function remainingVotesForUser(userId: string): Promise<number> {
  const dbResult = await withD1(async (db) => {
    const userRow = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<SqliteRow>();
    if (!userRow) {
      return 0;
    }
    const user = userFromRow(userRow);
    const activity = activityFromRow((await db.prepare("SELECT * FROM activities LIMIT 1").first<SqliteRow>())!);
    const spent = await db
      .prepare("SELECT COALESCE(SUM(count), 0) AS count FROM votes WHERE voter_user_id = ? AND status = 'valid'")
      .bind(userId)
      .first<{ count: number }>();
    return Math.max(0, quotaForUser(user, activity) - Number(spent?.count ?? 0));
  });
  if (typeof dbResult === "number") {
    return dbResult;
  }

  const store = getStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) {
    return 0;
  }
  const spent = store.votes
    .filter((vote) => vote.voterUserId === userId && vote.status === "valid")
    .reduce((sum, vote) => sum + vote.count, 0);
  return Math.max(0, quotaForUser(user, store.activity) - spent);
}

function updateLocalWorkVoteCache(workId: string) {
  const store = getStore();
  const work = store.works.find((item) => item.id === workId);
  if (!work) {
    return;
  }
  work.voteCountCache = store.votes
    .filter((vote) => vote.workId === workId && vote.status === "valid")
    .reduce((sum, vote) => sum + vote.count, 0);
}

async function nextWorkCode(db?: D1DatabaseLike) {
  if (db) {
    const row = await db.prepare("SELECT COUNT(*) AS count FROM works").first<{ count: number }>();
    return `A${String(Number(row?.count ?? 0) + 1).padStart(3, "0")}`;
  }
  const count = getStore().works.length + 1;
  return `A${String(count).padStart(3, "0")}`;
}

export async function createWork(input: {
  owner: User;
  title: string;
  mediaType: Work["mediaType"];
  mediaUrl: string;
  previewUrl: string;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
}) {
  const dbResult = await withD1(async (db) => {
    const activity = activityFromRow((await db.prepare("SELECT * FROM activities LIMIT 1").first<SqliteRow>())!);
    if (!input.owner.canUpload) {
      throw new Error("当前账号没有上传权限");
    }
    if (!["uploading", "voting"].includes(activity.status)) {
      throw new Error("当前活动阶段不可上传");
    }
    const currentWork = await db
      .prepare("SELECT id FROM works WHERE owner_user_id = ? AND status IN ('active', 'hidden') LIMIT 1")
      .bind(input.owner.id)
      .first<{ id: string }>();
    if (currentWork) {
      throw new Error("请先删除当前作品再重新上传");
    }

    const now = timestamp();
    const code = await nextWorkCode(db);
    const work: Work = {
      id: createId("work"),
      activityId: activity.id,
      ownerUserId: input.owner.id,
      ownerEmployeeNo: input.owner.employeeNo,
      ownerDisplayName: input.owner.displayName,
      code,
      title: input.title.trim() || `${input.owner.displayName} 的作品`,
      mediaType: input.mediaType,
      mediaUrl: input.mediaUrl,
      previewUrl: input.previewUrl,
      mimeType: input.mimeType,
      originalFileName: input.originalFileName,
      sizeBytes: input.sizeBytes,
      status: "active",
      voteCountCache: 0,
      sharePath: `/share/${code}`,
      createdAt: now,
      deletedAt: null
    };
    await db
      .prepare(
        "INSERT INTO works (id, activity_id, owner_user_id, owner_employee_no, owner_display_name, code, title, media_type, media_url, preview_url, mime_type, original_file_name, size_bytes, status, vote_count_cache, share_path, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        work.id,
        work.activityId,
        work.ownerUserId,
        work.ownerEmployeeNo,
        work.ownerDisplayName,
        work.code,
        work.title,
        work.mediaType,
        work.mediaUrl,
        work.previewUrl,
        work.mimeType,
        work.originalFileName,
        work.sizeBytes,
        work.status,
        work.voteCountCache,
        work.sharePath,
        work.createdAt,
        work.deletedAt
      )
      .run();
    await insertAuditLog({
      actorUserId: input.owner.id,
      action: "work.created",
      targetType: "work",
      targetId: work.id,
      payload: { code: work.code, mediaType: work.mediaType }
    });
    return work;
  });
  if (dbResult) {
    return dbResult;
  }

  const store = getStore();
  if (!input.owner.canUpload) {
    throw new Error("当前账号没有上传权限");
  }
  if (!["uploading", "voting"].includes(store.activity.status)) {
    throw new Error("当前活动阶段不可上传");
  }
  if (await getWorkForUser(input.owner.id)) {
    throw new Error("请先删除当前作品再重新上传");
  }

  const now = timestamp();
  const code = await nextWorkCode();
  const work: Work = {
    id: createId("work"),
    activityId: store.activity.id,
    ownerUserId: input.owner.id,
    ownerEmployeeNo: input.owner.employeeNo,
    ownerDisplayName: input.owner.displayName,
    code,
    title: input.title.trim() || `${input.owner.displayName} 的作品`,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    previewUrl: input.previewUrl,
    mimeType: input.mimeType,
    originalFileName: input.originalFileName,
    sizeBytes: input.sizeBytes,
    status: "active",
    voteCountCache: 0,
    sharePath: `/share/${code}`,
    createdAt: now,
    deletedAt: null
  };
  store.works.push(work);
  await insertAuditLog({
    actorUserId: input.owner.id,
    action: "work.created",
    targetType: "work",
    targetId: work.id,
    payload: { code: work.code, mediaType: work.mediaType }
  });
  persistStore();
  return work;
}

function voidLocalVotesForWork(workId: string, reason: string) {
  const store = getStore();
  for (const vote of store.votes) {
    if (vote.workId === workId && vote.status === "valid") {
      vote.status = "void";
      vote.reason = reason;
    }
  }
}

export async function deleteWork(input: { actor: User; workId: string; asAdmin?: boolean }) {
  const dbResult = await withD1(async (db) => {
    const row = await db.prepare("SELECT * FROM works WHERE id = ?").bind(input.workId).first<SqliteRow>();
    if (!row) {
      throw new Error("作品不存在");
    }
    const work = workFromRow(row);
    const canDelete = input.asAdmin ? input.actor.role === "admin" : work.ownerUserId === input.actor.id;
    if (!canDelete) {
      throw new Error("没有删除该作品的权限");
    }
    const deletedAt = timestamp();
    await db.prepare("UPDATE works SET status = 'deleted', deleted_at = ? WHERE id = ?").bind(deletedAt, work.id).run();
    await voidD1VotesForWork(db, work.id, input.asAdmin ? "admin_deleted" : "user_deleted");
    await refreshD1WorkVoteCache(db, work.id);
    await insertAuditLog({
      actorUserId: input.actor.id,
      action: input.asAdmin ? "work.deleted_by_admin" : "work.deleted_by_owner",
      targetType: "work",
      targetId: work.id,
      payload: { code: work.code }
    });
    return { ...work, status: "deleted" as const, deletedAt };
  });
  if (dbResult) {
    return dbResult;
  }

  const store = getStore();
  const work = store.works.find((item) => item.id === input.workId);
  if (!work) {
    throw new Error("作品不存在");
  }
  const canDelete = input.asAdmin ? input.actor.role === "admin" : work.ownerUserId === input.actor.id;
  if (!canDelete) {
    throw new Error("没有删除该作品的权限");
  }
  work.status = "deleted";
  work.deletedAt = timestamp();
  voidLocalVotesForWork(work.id, input.asAdmin ? "admin_deleted" : "user_deleted");
  updateLocalWorkVoteCache(work.id);
  await insertAuditLog({
    actorUserId: input.actor.id,
    action: input.asAdmin ? "work.deleted_by_admin" : "work.deleted_by_owner",
    targetType: "work",
    targetId: work.id,
    payload: { code: work.code }
  });
  persistStore();
  return work;
}

export async function castVotes(input: { voter: User; workId: string; count: number }) {
  const dbResult = await withD1(async (db) => {
    const workRow = await db.prepare("SELECT * FROM works WHERE id = ?").bind(input.workId).first<SqliteRow>();
    if (!workRow) {
      throw new Error("作品不可投票");
    }
    const work = workFromRow(workRow);
    const activity = activityFromRow((await db.prepare("SELECT * FROM activities LIMIT 1").first<SqliteRow>())!);
    if (work.status !== "active") {
      throw new Error("作品不可投票");
    }
    if (!input.voter.canVote) {
      throw new Error("当前账号没有投票权限");
    }
    if (activity.status !== "voting") {
      throw new Error("当前不在投票阶段");
    }
    if (input.count < 1) {
      throw new Error("至少投 1 票");
    }
    if (!activity.allowSelfVote && work.ownerUserId === input.voter.id) {
      throw new Error("当前活动不允许给自己的作品投票");
    }
    const remaining = await remainingVotesForUser(input.voter.id);
    if (remaining < input.count) {
      throw new Error("剩余票数不足");
    }
    const vote: Vote = {
      id: createId("vote"),
      activityId: activity.id,
      voterUserId: input.voter.id,
      voterEmployeeNo: input.voter.employeeNo,
      workId: work.id,
      workCode: work.code,
      count: input.count,
      status: "valid",
      reason: null,
      createdAt: timestamp()
    };
    await db
      .prepare(
        "INSERT INTO votes (id, activity_id, voter_user_id, voter_employee_no, work_id, work_code, count, status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        vote.id,
        vote.activityId,
        vote.voterUserId,
        vote.voterEmployeeNo,
        vote.workId,
        vote.workCode,
        vote.count,
        vote.status,
        vote.reason,
        vote.createdAt
      )
      .run();
    await refreshD1WorkVoteCache(db, work.id);
    await insertAuditLog({
      actorUserId: input.voter.id,
      action: "vote.cast",
      targetType: "work",
      targetId: work.id,
      payload: { workCode: work.code, count: input.count }
    });
    return {
      vote,
      remainingVotes: await remainingVotesForUser(input.voter.id),
      work: (await getWorkById(work.id))!
    };
  });
  if (dbResult) {
    return dbResult;
  }

  const store = getStore();
  const work = store.works.find((item) => item.id === input.workId);
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
  const remaining = await remainingVotesForUser(input.voter.id);
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
  updateLocalWorkVoteCache(work.id);
  await insertAuditLog({
    actorUserId: input.voter.id,
    action: "vote.cast",
    targetType: "work",
    targetId: work.id,
    payload: { workCode: work.code, count: input.count }
  });
  persistStore();
  return { vote, remainingVotes: await remainingVotesForUser(input.voter.id), work: (await getWorkById(work.id))! };
}

export async function revokeVote(input: { voter: User; voteId: string }) {
  const dbResult = await withD1(async (db) => {
    const row = await db.prepare("SELECT * FROM votes WHERE id = ?").bind(input.voteId).first<SqliteRow>();
    if (!row) {
      throw new Error("投票记录不存在");
    }
    const vote = voteFromRow(row);
    if (vote.voterUserId !== input.voter.id) {
      throw new Error("不能撤回他人的投票");
    }
    if (vote.status !== "valid") {
      throw new Error("该投票已撤回");
    }
    await db.prepare("UPDATE votes SET status = 'void', reason = ? WHERE id = ?").bind("revoked_by_voter", vote.id).run();
    await refreshD1WorkVoteCache(db, vote.workId);
    await insertAuditLog({
      actorUserId: input.voter.id,
      action: "vote.revoked",
      targetType: "vote",
      targetId: vote.id,
      payload: { workCode: vote.workCode, count: vote.count }
    });
    return {
      vote: { ...vote, status: "void" as const, reason: "revoked_by_voter" },
      remainingVotes: await remainingVotesForUser(input.voter.id),
      work: (await getWorkById(vote.workId))!
    };
  });
  if (dbResult) {
    return dbResult;
  }

  const vote = getStore().votes.find((item) => item.id === input.voteId);
  if (!vote) {
    throw new Error("投票记录不存在");
  }
  if (vote.voterUserId !== input.voter.id) {
    throw new Error("不能撤回他人的投票");
  }
  if (vote.status !== "valid") {
    throw new Error("该投票已撤回");
  }
  vote.status = "void";
  vote.reason = "revoked_by_voter";
  updateLocalWorkVoteCache(vote.workId);
  await insertAuditLog({
    actorUserId: input.voter.id,
    action: "vote.revoked",
    targetType: "vote",
    targetId: vote.id,
    payload: { workCode: vote.workCode, count: vote.count }
  });
  persistStore();
  return { vote, remainingVotes: await remainingVotesForUser(input.voter.id), work: (await getWorkById(vote.workId))! };
}

export async function listVotesForUser(userId: string): Promise<Vote[]> {
  const rows = await queryAll<SqliteRow>("SELECT * FROM votes WHERE voter_user_id = ? ORDER BY created_at DESC", userId);
  if (rows) {
    return rows.map(voteFromRow);
  }
  return getStore().votes
    .filter((vote) => vote.voterUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listVotes(): Promise<Vote[]> {
  const rows = await queryAll<SqliteRow>("SELECT * FROM votes ORDER BY created_at DESC");
  if (rows) {
    return rows.map(voteFromRow);
  }
  return [...getStore().votes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateUserConfig(
  userId: string,
  patch: Partial<Pick<User, "canUpload" | "canVote" | "voteQuota" | "displayName" | "role">>
) {
  const dbResult = await withD1(async (db) => {
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("用户不存在");
    }
    const updated = { ...user, ...patch, updatedAt: timestamp() };
    await db
      .prepare(
        "UPDATE users SET display_name = ?, role = ?, can_upload = ?, can_vote = ?, vote_quota = ?, updated_at = ? WHERE id = ?"
      )
      .bind(
        updated.displayName,
        updated.role,
        updated.canUpload ? 1 : 0,
        updated.canVote ? 1 : 0,
        updated.voteQuota,
        updated.updatedAt,
        updated.id
      )
      .run();
    return updated;
  });
  if (dbResult) {
    return dbResult;
  }

  const user = getStore().users.find((item) => item.id === userId);
  if (!user) {
    throw new Error("用户不存在");
  }
  Object.assign(user, patch, { updatedAt: timestamp() });
  persistStore();
  return user;
}

export async function createUser(input: {
  employeeNo: string;
  displayName: string;
  role?: User["role"];
  accessCode?: string;
  canUpload?: boolean;
  canVote?: boolean;
  voteQuota?: number | null;
}) {
  const dbResult = await withD1(async (db) => {
    const existing = await db.prepare("SELECT id FROM users WHERE employee_no = ?").bind(input.employeeNo).first<{ id: string }>();
    if (existing) {
      throw new Error("工号已存在");
    }
    const now = timestamp();
    const user: User = {
      id: createId("user"),
      employeeNo: input.employeeNo,
      displayName: input.displayName,
      role: input.role ?? "participant",
      accessCode: input.accessCode ?? "demo123",
      canUpload: input.canUpload ?? true,
      canVote: input.canVote ?? true,
      voteQuota: input.voteQuota ?? null,
      createdAt: now,
      updatedAt: now
    };
    await db
      .prepare(
        "INSERT INTO users (id, employee_no, display_name, role, can_upload, can_vote, vote_quota, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        user.id,
        user.employeeNo,
        user.displayName,
        user.role,
        user.canUpload ? 1 : 0,
        user.canVote ? 1 : 0,
        user.voteQuota,
        user.accessCode,
        user.createdAt,
        user.updatedAt
      )
      .run();
    return user;
  });
  if (dbResult) {
    return dbResult;
  }

  if (getStore().users.some((user) => user.employeeNo === input.employeeNo)) {
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

export async function updateWorkStatus(workId: string, status: WorkStatus) {
  const dbResult = await withD1(async (db) => {
    const row = await db.prepare("SELECT * FROM works WHERE id = ?").bind(workId).first<SqliteRow>();
    if (!row) {
      throw new Error("作品不存在");
    }
    const work = workFromRow(row);
    await db
      .prepare("UPDATE works SET status = ?, deleted_at = CASE WHEN ? = 'deleted' THEN ? ELSE deleted_at END WHERE id = ?")
      .bind(status, status, status === "deleted" ? timestamp() : null, workId)
      .run();
    if (status !== "active") {
      await voidD1VotesForWork(db, work.id, `status_${status}`);
    }
    await refreshD1WorkVoteCache(db, work.id);
    return (await getWorkById(work.id))!;
  });
  if (dbResult) {
    return dbResult;
  }

  const work = getStore().works.find((item) => item.id === workId);
  if (!work) {
    throw new Error("作品不存在");
  }
  work.status = status;
  if (status === "deleted") {
    work.deletedAt = timestamp();
  }
  if (status !== "active") {
    voidLocalVotesForWork(work.id, `status_${status}`);
  }
  updateLocalWorkVoteCache(work.id);
  persistStore();
  return work;
}

export async function updateActivityConfig(patch: Partial<Activity>) {
  const dbResult = await withD1(async (db) => {
    const activity = await getActivity();
    const updated = { ...activity, ...patch, updatedAt: timestamp() };
    await db
      .prepare(
        "UPDATE activities SET status = ?, default_vote_quota = ?, allow_self_vote = ?, show_public_votes = ?, upload_ends_at = ?, vote_ends_at = ?, updated_at = ? WHERE id = ?"
      )
      .bind(
        updated.status,
        updated.defaultVoteQuota,
        updated.allowSelfVote ? 1 : 0,
        updated.showPublicVotes ? 1 : 0,
        updated.uploadEndsAt,
        updated.voteEndsAt,
        updated.updatedAt,
        updated.id
      )
      .run();
    return updated;
  });
  if (dbResult) {
    return dbResult;
  }
  const activity = getStore().activity;
  Object.assign(activity, patch, { updatedAt: timestamp() });
  persistStore();
  return activity;
}

export async function getAdminSummary() {
  const [activity, allWorks, votes] = await Promise.all([getActivity(), listAllWorks(), listVotes()]);
  const activeWorks = allWorks.filter((work) => work.status === "active");
  const validVotes = votes.filter((vote) => vote.status === "valid");
  const voters = new Set(validVotes.map((vote) => vote.voterUserId));
  return {
    activity,
    worksCount: activeWorks.length,
    totalVotes: validVotes.reduce((sum, vote) => sum + vote.count, 0),
    votersCount: voters.size,
    hiddenWorksCount: allWorks.filter((work) => work.status === "hidden").length,
    deletedWorksCount: allWorks.filter((work) => work.status === "deleted").length,
    ranking: (await listWorks(false)).slice(0, 5)
  };
}

export async function exportSnapshot(): Promise<AppStore> {
  return {
    activity: await getActivity(),
    users: await listUsers(),
    works: await listAllWorks(),
    votes: await listVotes(),
    auditLogs: getStore().auditLogs,
    uploadSessions: getStore().uploadSessions
  };
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^\w.\-()\u4e00-\u9fa5]+/g, "_").slice(0, 120) || "upload.bin";
}

function extensionFromName(fileName: string) {
  return sanitizeFileName(fileName).split(".").pop()?.toLowerCase() || "bin";
}

export async function listUploadSessionsForUser(userId: string): Promise<UploadSession[]> {
  const rows = await queryAll<SqliteRow>(
    "SELECT * FROM upload_sessions WHERE owner_user_id = ? ORDER BY created_at DESC",
    userId
  );
  if (rows) {
    return rows.map(uploadSessionFromRow);
  }
  return getStore().uploadSessions
    .filter((session) => session.ownerUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getUploadSession(uploadId: string): Promise<UploadSession | null> {
  const row = await queryFirst<SqliteRow>("SELECT * FROM upload_sessions WHERE id = ?", uploadId);
  if (row) {
    return uploadSessionFromRow(row);
  }
  if (row === null && (await getD1())) {
    return null;
  }
  return getStore().uploadSessions.find((session) => session.id === uploadId) ?? null;
}

export async function createUploadSession(input: {
  owner: User;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageUploadId?: string | null;
}) {
  const dbResult = await withD1(async (db) => {
    validateUploadFile({ mimeType: input.mimeType, sizeBytes: input.sizeBytes });
    const activity = activityFromRow((await db.prepare("SELECT * FROM activities LIMIT 1").first<SqliteRow>())!);
    if (!input.owner.canUpload) {
      throw new Error("当前账号没有上传权限");
    }
    if (!["uploading", "voting"].includes(activity.status)) {
      throw new Error("当前活动阶段不可上传");
    }
    const currentWork = await db
      .prepare("SELECT id FROM works WHERE owner_user_id = ? AND status IN ('active', 'hidden') LIMIT 1")
      .bind(input.owner.id)
      .first<{ id: string }>();
    if (currentWork) {
      throw new Error("请先删除当前作品再重新上传");
    }
    const now = timestamp();
    const workDraftId = createId("draft");
    const ext = extensionFromName(input.fileName);
    const session: UploadSession = {
      id: createId("upload"),
      workDraftId,
      activityId: activity.id,
      ownerUserId: input.owner.id,
      objectKey: `activities/${activity.id}/works/${workDraftId}/original.${ext}`,
      storageUploadId: input.storageUploadId ?? null,
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
    await db
      .prepare(
        "INSERT INTO upload_sessions (id, work_draft_id, activity_id, owner_user_id, object_key, storage_upload_id, file_name, title, media_type, mime_type, size_bytes, part_size, total_parts, parts_json, status, error, result_work_id, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        session.id,
        session.workDraftId,
        session.activityId,
        session.ownerUserId,
        session.objectKey,
        session.storageUploadId,
        session.fileName,
        session.title,
        session.mediaType,
        session.mimeType,
        session.sizeBytes,
        session.partSize,
        session.totalParts,
        JSON.stringify(session.parts),
        session.status,
        session.error,
        session.resultWorkId,
        session.createdAt,
        session.updatedAt,
        session.expiresAt
      )
      .run();
    return session;
  });
  if (dbResult) {
    return dbResult;
  }

  const store = getStore();
  validateUploadFile({ mimeType: input.mimeType, sizeBytes: input.sizeBytes });
  if (!input.owner.canUpload) {
    throw new Error("当前账号没有上传权限");
  }
  if (!["uploading", "voting"].includes(store.activity.status)) {
    throw new Error("当前活动阶段不可上传");
  }
  if (await getWorkForUser(input.owner.id)) {
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
    storageUploadId: input.storageUploadId ?? null,
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

export async function recordUploadPart(input: {
  actor: User;
  uploadId: string;
  partNumber: number;
  etag: string;
  sizeBytes: number;
}) {
  const session = await getUploadSession(input.uploadId);
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
  const parts = [...session.parts.filter((part) => part.partNumber !== input.partNumber), nextPart].sort(
    (a, b) => a.partNumber - b.partNumber
  );

  const dbResult = await withD1(async (db) => {
    await db
      .prepare("UPDATE upload_sessions SET parts_json = ?, status = 'uploading', error = NULL, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(parts), now, session.id)
      .run();
    return { ...session, parts, status: "uploading" as const, error: null, updatedAt: now };
  });
  if (dbResult) {
    return dbResult;
  }

  const localSession = getStore().uploadSessions.find((item) => item.id === input.uploadId);
  if (localSession) {
    localSession.parts = parts;
    localSession.status = "uploading";
    localSession.updatedAt = now;
    localSession.error = null;
    persistStore();
    return localSession;
  }
  return { ...session, parts, status: "uploading" as const, error: null, updatedAt: now };
}

export async function setUploadSessionStorageUploadId(uploadId: string, storageUploadId: string) {
  const session = await getUploadSession(uploadId);
  if (!session) {
    throw new Error("上传会话不存在");
  }
  const dbResult = await withD1(async (db) => {
    const now = timestamp();
    await db
      .prepare("UPDATE upload_sessions SET storage_upload_id = ?, updated_at = ? WHERE id = ?")
      .bind(storageUploadId, now, uploadId)
      .run();
    return { ...session, storageUploadId, updatedAt: now };
  });
  if (dbResult) {
    return dbResult;
  }
  const localSession = getStore().uploadSessions.find((item) => item.id === uploadId);
  if (localSession) {
    localSession.storageUploadId = storageUploadId;
    localSession.updatedAt = timestamp();
    persistStore();
    return localSession;
  }
  return { ...session, storageUploadId };
}

export async function failUploadSession(uploadId: string, error: string) {
  const dbResult = await withD1(async (db) => {
    const now = timestamp();
    await db.prepare("UPDATE upload_sessions SET status = 'failed', error = ?, updated_at = ? WHERE id = ?").bind(error, now, uploadId).run();
    return getUploadSession(uploadId);
  });
  if (dbResult !== null) {
    return dbResult;
  }

  const session = getStore().uploadSessions.find((item) => item.id === uploadId);
  if (!session) {
    return null;
  }
  session.status = "failed";
  session.error = error;
  session.updatedAt = timestamp();
  persistStore();
  return session;
}

export async function abortUploadSession(input: { actor: User; uploadId: string }) {
  const session = await getUploadSession(input.uploadId);
  if (!session || session.ownerUserId !== input.actor.id) {
    throw new Error("上传会话不存在");
  }
  const dbResult = await withD1(async (db) => {
    const now = timestamp();
    await db.prepare("UPDATE upload_sessions SET status = 'aborted', updated_at = ? WHERE id = ?").bind(now, input.uploadId).run();
    return { ...session, status: "aborted" as const, updatedAt: now };
  });
  if (dbResult) {
    return dbResult;
  }

  const localSession = getStore().uploadSessions.find((item) => item.id === input.uploadId);
  if (localSession) {
    localSession.status = "aborted";
    localSession.updatedAt = timestamp();
    persistStore();
    return localSession;
  }
  return { ...session, status: "aborted" as const, updatedAt: timestamp() };
}

export async function completeUploadSession(input: {
  actor: User;
  uploadId: string;
  mediaUrl: string;
  previewUrl: string;
  parts?: UploadPartRecord[];
}) {
  const session = await getUploadSession(input.uploadId);
  if (!session || session.ownerUserId !== input.actor.id) {
    throw new Error("上传会话不存在");
  }
  if (session.status === "completed") {
    const existing = session.resultWorkId ? await getWorkById(session.resultWorkId) : null;
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

  const work = await createWork({
    owner: input.actor,
    title: session.title,
    mediaType: session.mediaType,
    mediaUrl: input.mediaUrl,
    previewUrl: input.previewUrl,
    mimeType: session.mimeType,
    originalFileName: session.fileName,
    sizeBytes: session.sizeBytes
  });

  const dbResult = await withD1(async (db) => {
    const now = timestamp();
    await db
      .prepare("UPDATE upload_sessions SET status = 'completed', result_work_id = ?, parts_json = ?, updated_at = ? WHERE id = ?")
      .bind(work.id, JSON.stringify(parts), now, session.id)
      .run();
    return { ...session, status: "completed" as const, resultWorkId: work.id, parts, updatedAt: now };
  });
  if (dbResult) {
    return { session: dbResult, work };
  }

  const localSession = getStore().uploadSessions.find((item) => item.id === input.uploadId);
  if (localSession) {
    localSession.status = "completed";
    localSession.resultWorkId = work.id;
    localSession.parts = parts;
    localSession.updatedAt = timestamp();
    persistStore();
    return { session: localSession, work };
  }
  return { session: { ...session, status: "completed" as const, resultWorkId: work.id, parts }, work };
}
