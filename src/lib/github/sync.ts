import { decryptSecret } from "@/lib/crypto";
import { getIntegration, getIntegrationToken, markSynced } from "@/lib/db/queries";
import { audit } from "@/lib/db";
import { ingestEvent } from "@/lib/services/ingest";
import type { NormalizedEvent, NormalizedEventType } from "@/lib/evidence/classify";
import { fetchPublicEvents, fetchRepoMeta, fetchRepos, fetchViewer, type GithubEvent } from "@/lib/github/client";

interface RepoIndex {
  language: string | null;
  topics: string[];
}

function normalize(
  event: GithubEvent,
  login: string,
  repos: Map<string, RepoIndex>,
): NormalizedEvent | null {
  const repo = event.repo;
  const meta = repos.get(repo) ?? { language: null, topics: [] };
  const base = {
    source: "github" as const,
    externalId: `gh:${event.id}`,
    occurredAt: event.createdAt,
    projectReference: repo,
    attribution: "self" as const,
    isDemo: false,
  };

  const withRepo = {
    repository: repo,
    language: meta.language,
    languages: meta.language ? [meta.language] : [],
    topics: meta.topics,
  };

  const payload = event.payload;

  switch (event.type) {
    case "CreateEvent": {
      if (payload.ref_type !== "repository") return null;
      return {
        ...base,
        eventType: "repository_created",
        payload: { ...withRepo, title: `Repository created: ${repo}` },
      };
    }
    case "PushEvent": {
      const commits = Array.isArray(payload.commits)
        ? (payload.commits as Array<{ message?: string }>)
        : [];
      const author = (payload as { head?: string }).head;
      if (!author && commits.length === 0) return null;
      return {
        ...base,
        eventType: "commit_activity",
        payload: {
          ...withRepo,
          title: commits[0]?.message?.split("\n")[0] ?? `Commit series in ${repo}`,
          commitCount: commits.length,
          distinctSize: (payload.distinct_size as number | undefined) ?? commits.length,
        },
      };
    }
    case "PullRequestEvent": {
      const pull = payload.pull_request as
        | {
            title?: string;
            merged?: boolean;
            user?: { login?: string };
            additions?: number;
            deletions?: number;
            changed_files?: number;
          }
        | undefined;
      if (!pull) return null;
      // Only the authenticated author's contribution is attributed to them.
      if (pull.user?.login && pull.user.login !== login) return null;
      const action = payload.action as string | undefined;
      const eventType: NormalizedEventType = pull.merged
        ? "pull_request_merged"
        : "pull_request_opened";
      if (action !== "closed" && action !== "opened") return null;
      if (action === "closed" && !pull.merged) return null;
      return {
        ...base,
        eventType,
        payload: {
          ...withRepo,
          title: pull.title ?? `Pull request in ${repo}`,
          additions: pull.additions ?? 0,
          deletions: pull.deletions ?? 0,
          files: [],
          changedFiles: pull.changed_files ?? 0,
        },
      };
    }
    case "PullRequestReviewEvent": {
      const review = payload.review as { body?: string; state?: string } | undefined;
      const pull = payload.pull_request as { title?: string } | undefined;
      return {
        ...base,
        eventType: "code_review_submitted",
        payload: {
          ...withRepo,
          title: `Review: ${pull?.title ?? repo}`,
          reviewComments: review?.body ? Math.max(1, review.body.split("\n\n").length) : 1,
          bodyLength: review?.body?.length ?? 0,
          files: [],
        },
      };
    }
    case "IssuesEvent": {
      const issue = payload.issue as { title?: string; user?: { login?: string } } | undefined;
      const action = payload.action as string | undefined;
      if (!issue) return null;
      if (issue.user?.login && issue.user.login !== login) return null;
      const eventType: NormalizedEventType =
        action === "closed" ? "issue_resolved" : "issue_created";
      return {
        ...base,
        eventType,
        payload: { ...withRepo, title: issue.title ?? `Issue in ${repo}`, files: [] },
      };
    }
    case "ReleaseEvent": {
      const release = payload.release as { tag_name?: string; name?: string } | undefined;
      return {
        ...base,
        eventType: "release_published",
        payload: {
          ...withRepo,
          title: `Release ${release?.tag_name ?? ""}`.trim(),
          version: release?.tag_name,
          files: [".github/workflows"],
        },
      };
    }
    default:
      return null;
  }
}

export interface SyncReport {
  imported: number;
  skipped: number;
  repos: number;
  error: string | null;
  syncedAt: string;
}

/**
 * Initial and incremental sync. Idempotency lives in the ingest layer, so
 * running this repeatedly cannot duplicate a contribution.
 */
export async function syncGithub(userId: string): Promise<SyncReport> {
  const integration = getIntegration(userId, "github");
  const encrypted = getIntegrationToken(userId, "github");
  const token = encrypted ? decryptSecret(encrypted) : null;

  if (!integration) {
    return {
      imported: 0,
      skipped: 0,
      repos: 0,
      error: "GitHub is not connected for this account.",
      syncedAt: new Date().toISOString(),
    };
  }
  if (integration.status === "demo") {
    return {
      imported: 0,
      skipped: 0,
      repos: 0,
      error: null,
      syncedAt: new Date().toISOString(),
    };
  }
  if (!token) {
    markSynced(userId, "github", "Stored credential could not be decrypted. Reconnect GitHub.");
    return {
      imported: 0,
      skipped: 0,
      repos: 0,
      error: "Stored credential could not be decrypted.",
      syncedAt: new Date().toISOString(),
    };
  }

  try {
    const viewer = await fetchViewer(token);
    const repos = await fetchRepos(token);
    const repoIndex = new Map<string, RepoIndex>(
      repos.map((repo) => [repo.fullName, { language: repo.language, topics: repo.topics }]),
    );

    const events = await fetchPublicEvents(viewer.login);
    // Enrich repositories that only appear in the event stream.
    const missing = Array.from(
      new Set(events.map((event) => event.repo).filter((repo) => !repoIndex.has(repo))),
    ).slice(0, 20);
    for (const repo of missing) {
      const meta = await fetchRepoMeta(repo, token);
      if (meta) repoIndex.set(repo, meta);
    }

    let imported = 0;
    let skipped = 0;
    for (const event of events) {
      const normalized = normalize(event, viewer.login, repoIndex);
      if (!normalized) {
        skipped += 1;
        continue;
      }
      const result = ingestEvent(userId, normalized);
      if (result.created) imported += 1;
      else skipped += 1;
    }

    markSynced(userId, "github", null);
    audit({
      userId,
      action: "integration.sync",
      target: "github",
      metadata: { imported, skipped, repos: repos.length },
    });

    return {
      imported,
      skipped,
      repos: repos.length,
      error: null,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Synchronization failed for an unknown reason.";
    markSynced(userId, "github", message);
    audit({ userId, action: "integration.sync.failed", target: "github", metadata: { message } });
    return {
      imported: 0,
      skipped: 0,
      repos: 0,
      error: message,
      syncedAt: new Date().toISOString(),
    };
  }
}
