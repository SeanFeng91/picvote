export type Role = "participant" | "special" | "admin";
export type MediaType = "image" | "video";
export type WorkStatus = "active" | "hidden" | "deleted" | "rejected";
export type VoteStatus = "valid" | "void";
export type ActivityStatus = "draft" | "uploading" | "voting" | "closed" | "published";
export type UploadSessionStatus = "pending" | "uploading" | "completed" | "aborted" | "failed";

export type Activity = {
  id: string;
  name: string;
  status: ActivityStatus;
  defaultVoteQuota: number;
  allowSelfVote: boolean;
  showPublicVotes: boolean;
  uploadEndsAt: string | null;
  voteEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  employeeNo: string;
  displayName: string;
  role: Role;
  canUpload: boolean;
  canVote: boolean;
  voteQuota: number | null;
  accessCode: string;
  createdAt: string;
  updatedAt: string;
};

export type Work = {
  id: string;
  activityId: string;
  ownerUserId: string;
  ownerEmployeeNo: string;
  ownerDisplayName: string;
  code: string;
  title: string;
  mediaType: MediaType;
  mediaUrl: string;
  previewUrl: string;
  mimeType: string;
  originalFileName: string;
  sizeBytes: number;
  status: WorkStatus;
  voteCountCache: number;
  sharePath: string;
  createdAt: string;
  deletedAt: string | null;
};

export type Vote = {
  id: string;
  activityId: string;
  voterUserId: string;
  voterEmployeeNo: string;
  workId: string;
  workCode: string;
  count: number;
  status: VoteStatus;
  reason: string | null;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  payloadJson: string;
  createdAt: string;
};

export type UploadPartRecord = {
  partNumber: number;
  etag: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type UploadSession = {
  id: string;
  workDraftId: string;
  activityId: string;
  ownerUserId: string;
  objectKey: string;
  fileName: string;
  title: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  partSize: number;
  totalParts: number;
  parts: UploadPartRecord[];
  status: UploadSessionStatus;
  error: string | null;
  resultWorkId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export type AppStore = {
  activity: Activity;
  users: User[];
  works: Work[];
  votes: Vote[];
  auditLogs: AuditLog[];
  uploadSessions: UploadSession[];
};

export type SessionPayload = {
  userId: string;
  role: Role;
};
