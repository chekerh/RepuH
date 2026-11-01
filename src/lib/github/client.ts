import { env } from "@/lib/env";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "RepuH-MVP";

export interface GithubViewer {
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface GithubRepo {
  fullName: string;
  language: string | null;
  topics: string[];
  private: boolean;
  description: string | null;
}

export interface GithubEvent {
  id: string;
  type: string;
  createdAt: string;
  repo: string;
  payload: Record<string, unknown>;
}

async function githubFetch<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": USER_AGENT,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 401) throw new Error("GitHub rejected the token. Reconnect the integration.");
  if (response.status === 403) {
    const remaining = response.headers.get("x-ratelimit-remaining");
    if (remaining === "0") throw new Error("GitHub rate limit reached. Sync will resume on the next window.");
    throw new Error("GitHub refused the request for this account.");
  }
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}).`);
  return (await response.json()) as T;
}

export function authorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env.github.clientId,
    redirect_uri: redirectUri,
    scope: "read:user public_repo",
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    body: new URLSearchParams({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!data.access_token) throw new Error(data.error ?? "GitHub did not return a token.");
  return data.access_token;
}

export async function fetchViewer(token: string): Promise<GithubViewer> {
  const data = await githubFetch<{ login: string; name: string | null; avatar_url: string | null }>(
    "/user",
    token,
  );
  return { login: data.login, name: data.name, avatarUrl: data.avatar_url };
}

export async function fetchRepos(token: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await githubFetch<
      Array<{
        full_name: string;
        language: string | null;
        topics?: string[];
        private: boolean;
        description: string | null;
      }>
    >(`/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator`, token);
    if (batch.length === 0) break;
    repos.push(
      ...batch.map((repo) => ({
        fullName: repo.full_name,
        language: repo.language,
        topics: repo.topics ?? [],
        private: repo.private,
        description: repo.description,
      })),
    );
    if (batch.length < 100) break;
  }
  return repos;
}

export async function fetchPublicEvents(login: string): Promise<GithubEvent[]> {
  const events: GithubEvent[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await githubFetch<
      Array<{
        id: string;
        type: string;
        created_at: string;
        repo: { name: string };
        payload: Record<string, unknown>;
      }>
    >(`/users/${encodeURIComponent(login)}/events/public?per_page=100&page=${page}`);
    if (batch.length === 0) break;
    events.push(
      ...batch.map((event) => ({
        id: event.id,
        type: event.type,
        createdAt: event.created_at,
        repo: event.repo.name,
        payload: event.payload,
      })),
    );
    if (batch.length < 100) break;
  }
  return events;
}

export async function fetchRepoMeta(
  fullName: string,
  token: string,
): Promise<{ language: string | null; topics: string[] } | null> {
  try {
    const data = await githubFetch<{ language: string | null; topics?: string[] }>(
      `/repos/${fullName}`,
      token,
    );
    return { language: data.language, topics: data.topics ?? [] };
  } catch {
    return null;
  }
}
