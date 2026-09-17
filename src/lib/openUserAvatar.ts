/** Ensures only one UserAvatar profile popover is open at a time. */

let openInstanceId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeOpenUserAvatar(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOpenUserAvatarId() {
  return openInstanceId;
}

export function setOpenUserAvatarId(id: string | null) {
  if (openInstanceId === id) return;
  openInstanceId = id;
  emit();
}
