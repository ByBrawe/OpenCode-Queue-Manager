import test from "node:test";
import assert from "node:assert/strict";
import { parseStableVersion, compareStableVersions, nextReleaseVersion, releaseVersionForCommit } from "../src/release/version.mjs";

const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OTHER = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("release uses source version when not published yet", () => {
  assert.equal(nextReleaseVersion("0.3.0", null), "0.3.0");
  assert.equal(nextReleaseVersion("0.3.0", "0.2.2"), "0.3.0");
});

test("release increments patch automatically when source version was published", () => {
  assert.equal(nextReleaseVersion("0.3.0", "0.3.0"), "0.3.1");
  assert.equal(nextReleaseVersion("0.3.0", "0.3.7"), "0.3.8");
  assert.equal(nextReleaseVersion("0.3.0", "0.4.0"), "0.4.1");
});

test("release does not change minor and major unnecessarily", () => {
  assert.equal(compareStableVersions("1.0.0", "0.99.99"), 1);
  assert.equal(compareStableVersions("1.2.3", "1.2.3"), 0);
  assert.equal(compareStableVersions("1.2.2", "1.2.3"), -1);
  assert.deepEqual(parseStableVersion("1.2.3"), [1, 2, 3]);
});

test("same commit never publishes twice even if main workflow reruns", () => {
  assert.equal(releaseVersionForCommit("0.3.0", { version: "0.3.0", releaseCommit: SHA }, SHA), null);
  assert.equal(releaseVersionForCommit("0.3.0", { version: "0.3.0", gitHead: SHA }, SHA), null);
  assert.equal(releaseVersionForCommit("0.3.0", { version: "0.3.0", releaseCommit: SHA }, OTHER), "0.3.1");
});

test("rejects malformed versions and invalid source revision", () => {
  for (const value of ["0.3", "v0.3.0", "0.3.0-rc.1", "0.03.0", "a.b.c", "0.1.2 && rm -rf /"]) {
    assert.throws(() => nextReleaseVersion(value, null), /stable semver/);
  }
  assert.throws(() => releaseVersionForCommit("0.3.0", null, "not-a-sha"), /commit SHA/);
});
