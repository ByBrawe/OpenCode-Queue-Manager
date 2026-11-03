/**
 * Queue Manager core operations. No OpenCode dependency; deliberately pure.
 * The UI stages edits here and uses the official native Inbox API to publish.
 */
export const MAX_BATCH = 500;
export const MAX_FILE_LINES = 1000;

export function normalizeCount(value, max = MAX_BATCH) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) {
    throw new Error(`Count must be an integer between 1 and ${max}.`);
  }
  return n;
}

export function repeatMessage(text, count) {
  const message = String(text ?? "").trim();
  if (!message) throw new Error("Message cannot be blank.");
  return Array(normalizeCount(count)).fill(message);
}

export function parseMessageLines(content, max = MAX_FILE_LINES) {
  const lines = String(content ?? "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) throw new Error("File contains no non-empty lines.");
  if (lines.length > max) throw new Error(`File has more than ${max} messages.`);
  return lines;
}

export function editAt(items, index, text) {
  assertIndex(items, index);
  const message = String(text ?? "").trim();
  if (!message) throw new Error("Message cannot be blank.");
  const next = [...items];
  next[index] = message;
  return next;
}

export function deleteAt(items, index) {
  assertIndex(items, index);
  const next = [...items];
  next.splice(index, 1);
  return next;
}

export function moveAt(items, from, to) {
  assertIndex(items, from);
  assertIndex(items, to);
  const next = [...items];
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

export function summarize(text, max = 90) {
  const oneLine = String(text).replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}...` : oneLine;
}

function assertIndex(items, index) {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new RangeError(`Invalid queue index: ${index}`);
  }
}

/** Sequential, fail-fast, checkpointed publish.
 * Failed messages remain in local drafts. A crash after server admission but
 * before local checkpointing may cause a duplicate; see README.
 */
export async function flushDrafts({ getNext, accept, dropAccepted }) {
  let sent = 0;
  for (;;) {
    const next = getNext();
    if (next === undefined) return sent;
    await accept(next);
    await dropAccepted(next);
    sent += 1;
  }
}
