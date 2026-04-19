import * as Linking from "expo-linking";

export function getInternalPathFromUrl(url: string | null | undefined) {
  if (!url) return null;
  const parsed = Linking.parse(url);
  const path = parsed.path ?? "";

  if (!path) return null;

  if (path.startsWith("calls/")) return `/${path}`;
  if (path.startsWith("live/")) return `/${path}`;
  if (path.startsWith("messages")) return `/${path}`;
  if (path.startsWith("calendar")) return `/${path}`;
  if (path.startsWith("alerts")) return `/${path}`;
  if (path.startsWith("recordings")) return `/${path}`;
  if (path.startsWith("demo")) return `/${path}`;

  return `/${path}`;
}

export function buildCallDeepLink(roomId: string) {
  return Linking.createURL(`/calls/${roomId}`);
}
