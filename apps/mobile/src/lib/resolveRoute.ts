import type { MeState } from "@seeuaround/shared";

export function routeToPath(state: MeState): string {
  switch (state.route) {
    case "auth":
      return "/(auth)/email";
    case "age":
      return "/age";
    case "name":
      return "/name";
    case "accept":
      return `/accept/${state.routeParams?.id ?? state.pendingConnectionId}`;
    case "invite":
      return "/invite";
    case "overlap":
      return `/overlap/${state.routeParams?.id ?? state.unansweredOverlapId}`;
    case "thread":
      return `/thread/${state.routeParams?.id ?? state.activeThreadId}`;
    case "sunday":
      return "/sunday";
    case "pause":
      return "/pause";
    case "empty":
      return "/empty";
    case "people":
    default:
      return "/people";
  }
}

export function pathFromNotification(data: Record<string, unknown>): string | null {
  if (typeof data.overlapId === "string") return `/overlap/${data.overlapId}`;
  if (typeof data.threadId === "string") return `/thread/${data.threadId}`;
  if (data.route === "accept" && typeof data.connectionId === "string") {
    return `/accept/${data.connectionId}`;
  }
  if (data.route === "sunday" || data.route === "nudge") return "/sunday";
  if (data.route === "people" || data.route === "hangout") return "/people";
  if (data.route === "lock") return "/lock";
  return null;
}
