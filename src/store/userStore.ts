import { create } from 'zustand';
import { DEFAULT_LEARNER } from '../data/v6/catalogs/learnerProfileCatalog';
import { DOMAIN_KEYS, loadDomain, removeDomain, saveDomain } from '../services/persistence/demoPersistence';

interface UserState {
  activeProfileId: string;
  profileOverrides: Record<string, LearnerProfileOverride>;
  setProfile: (profileId: string) => void;
  updateProfile: (learnerId: string, patch: LearnerProfileOverride) => void;
  resetProfileOverride: (learnerId: string) => void;
  resetDemo: () => void;
}

export interface LearnerProfileOverride {
  name?: string;
  major?: string;
  identity?: string;
  goal?: string;
}

interface PersistedUser {
  activeProfileId: string;
  profileOverrides?: Record<string, LearnerProfileOverride>;
}

const persisted = loadDomain<PersistedUser>(DOMAIN_KEYS.user);
const initialProfileOverrides = persisted?.profileOverrides ?? {};

function persistUser(activeProfileId: string, profileOverrides: Record<string, LearnerProfileOverride>) {
  saveDomain<PersistedUser>(DOMAIN_KEYS.user, { activeProfileId, profileOverrides });
}

export const useUserStore = create<UserState>((set) => ({
  activeProfileId: persisted?.activeProfileId ?? DEFAULT_LEARNER.id,
  profileOverrides: initialProfileOverrides,
  setProfile: (profileId) => {
    set((state) => {
      persistUser(profileId, state.profileOverrides);
      return { activeProfileId: profileId };
    });
  },
  updateProfile: (learnerId, patch) => {
    set((state) => {
      const profileOverrides = {
        ...state.profileOverrides,
        [learnerId]: { ...state.profileOverrides[learnerId], ...patch },
      };
      persistUser(state.activeProfileId, profileOverrides);
      return { profileOverrides };
    });
  },
  resetProfileOverride: (learnerId) => {
    set((state) => {
      const profileOverrides = { ...state.profileOverrides };
      delete profileOverrides[learnerId];
      persistUser(state.activeProfileId, profileOverrides);
      return { profileOverrides };
    });
  },
  resetDemo: () => {
    for (const key of Object.values(DOMAIN_KEYS)) removeDomain(key);
    set({ activeProfileId: DEFAULT_LEARNER.id, profileOverrides: {} });
  },
}));
