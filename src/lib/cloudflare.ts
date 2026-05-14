type CloudflareEnv = {
  DB?: unknown;
  MEDIA_BUCKET?: unknown;
  VIVOPICVOTE_PUBLIC_BASE_URL?: string;
};

async function getCloudflareEnv(): Promise<CloudflareEnv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    return (context?.env as CloudflareEnv | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function getD1Database() {
  if (process.env.VIVOPICVOTE_DATA_PROVIDER !== "d1") {
    return null;
  }

  const env = await getCloudflareEnv();
  return env?.DB ?? null;
}

export async function getMediaBucket() {
  if (process.env.VIVOPICVOTE_STORAGE_PROVIDER !== "r2") {
    return null;
  }

  const env = await getCloudflareEnv();
  return env?.MEDIA_BUCKET ?? null;
}

export async function getPublicBaseUrl() {
  const env = await getCloudflareEnv();
  return env?.VIVOPICVOTE_PUBLIC_BASE_URL || process.env.VIVOPICVOTE_PUBLIC_BASE_URL || "";
}
