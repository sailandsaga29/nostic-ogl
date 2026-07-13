export function normalizeDatabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl?.trim()) {
    return undefined;
  }

  const trimmed = rawUrl.trim();
  const protocolMatch = trimmed.match(/^postgres(?:ql)?:\/\//i);
  if (!protocolMatch) {
    return trimmed;
  }

  const protocol = protocolMatch[0];
  const remainder = trimmed.slice(protocol.length);
  const atIndex = remainder.lastIndexOf('@');

  if (atIndex === -1) {
    return trimmed;
  }

  const credentials = remainder.slice(0, atIndex);
  const hostAndPath = remainder.slice(atIndex + 1);
  const colonIndex = credentials.indexOf(':');

  if (colonIndex === -1) {
    return trimmed;
  }

  const username = credentials.slice(0, colonIndex);
  const password = credentials.slice(colonIndex + 1);

  return `${protocol}${username}:${encodeURIComponent(password)}@${hostAndPath}`;
}
