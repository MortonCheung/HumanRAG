import { create } from 'zustand';
import { DEFAULT_LEARNER } from '../data/v6/catalogs/learnerProfileCatalog';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';

interface UserState {
  activeProfileId: string;
  setProfile: (profileId: string) => void;
  resetDemo: () => void;
}

interface PersistedUser {
  activeProfileId: string;
}

const persisted = loadDomain<PersistedUser>(DOMAIN_KEYS.user);

export const useUserStore = create<UserState>((set) => ({
  activeProfileId: persisted?.activeProfileId ?? DEFAULT_LEARNER.id,
  setProfile: (profileId) => {
    saveDomain(DOMAIN_KEYS.user, { activeProfileId: profileId });
    set({ activeProfileId: profileId });
  },
  resetDemo: () => {
    for (const key of Object.values(DOMAIN_KEYS)) removeDomain(key);
    set({ activeProfileId: DEFAULT_LEARNER.id });
  },
}));
