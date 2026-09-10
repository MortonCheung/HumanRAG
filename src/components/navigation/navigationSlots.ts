import { useSyncExternalStore } from 'react';

export type NavigationSlotName = 'back' | 'title' | 'primary' | 'actions';

const hosts = new Map<NavigationSlotName, HTMLElement>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const notify = () => { listeners.forEach((listener) => listener()); };

/** A callback ref owns its host, including late mounts and replacement headers. */
export function createNavigationHostRef(name: NavigationSlotName) {
  let ownedHost: HTMLElement | null = null;
  return (host: HTMLElement | null) => {
    const previous = ownedHost;
    ownedHost = host;
    if (host && hosts.get(name) !== host) {
      hosts.set(name, host);
      notify();
    } else if (!host && previous && hosts.get(name) === previous) {
      hosts.delete(name);
      notify();
    }
  };
}

export function useNavigationSlot(name: NavigationSlotName) {
  return useSyncExternalStore(subscribe, () => hosts.get(name) ?? null, () => null);
}
