import type { MeState } from "@seeuaround/shared";

export function routeToPath(state: MeState): string {
  switch (state.route) {
    case "auth":
      return "/(auth)/email";
    case "age":
      return "/age";
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
    case "people":
    default:
      return "/people";
  }
}

export function pathFromNotification(data: Record<string, unknown>): string | null {
  if (data.overlapId) return `/overlap/${data.overlapId}`;
  if (data.threadId) return `/thread/${data.threadId}`;
  if (data.route === "sunday") return "/sunday";
  if (data.route === "overlap" && data.overlapId) return `/overlap/${data.overlapId}`;
  return null;
}
