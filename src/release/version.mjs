// Pure version selection for unattended npm releases.
// Only stable numeric semver is supported intentionally: unexpected registry data stops publishing.
export function parseStableVersion(value) {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) {
    throw new Error("Expected stable semver X.Y.Z, got: " + String(value));
  }
  const parts = value.split(".").map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) {
    throw new Error("Semver component exceeds safe integer limit: " + value);
  }
  return parts;
}

export function compareStableVersions(first, second) {
  const a = parseStableVersion(first);
  const b = parseStableVersion(second);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

export function nextReleaseVersion(sourceVersion, publishedVersion) {
  parseStableVersion(sourceVersion);
  if (publishedVersion == null) return sourceVersion;
  if (compareStableVersions(sourceVersion, publishedVersion) > 0) return sourceVersion;
  const parts = parseStableVersion(publishedVersion);
  if (parts[2] === Number.MAX_SAFE_INTEGER) throw new Error("Patch number overflow");
  return parts[0] + "." + parts[1] + "." + (parts[2] + 1);
}

export function releaseVersionForCommit(sourceVersion, latest, commitSha) {
  if (!commitSha || !/^[\da-f]{40}$/i.test(commitSha)) {
    throw new Error("A full 40-character GitHub commit SHA is required");
  }
  if (latest && (latest.releaseCommit === commitSha || latest.gitHead === commitSha)) {
    return null; // Workflow rerun: this Git commit already exists on npm.
  }
  return nextReleaseVersion(sourceVersion, latest?.version ?? null);
}
