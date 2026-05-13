type CloudflareEnv = {
  DB?: unknown;
  MEDIA_BUCKET?: unknown;
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
