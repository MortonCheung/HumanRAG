import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import type { LearnerProfile } from '../../../data/v6/schemas/progressSchema';
import type { LearnerProfileOverride } from '../../../store/userStore';
import { MOTION } from '../../../motion/tokens';

const FIELD_LIMITS = { name: 20, major: 40, identity: 20, goal: 60 } as const;

type ProfileDraft = Pick<LearnerProfile, 'name' | 'major' | 'identity' | 'goal'>;

function draftFrom(profile: LearnerProfile): ProfileDraft {
  return { name: profile.name, major: profile.major, identity: profile.identity, goal: profile.goal };
}

export function ProfileEditorDrawer({ profile, open, onOpen, onClose, onSave, onRestore }: {
  profile: LearnerProfile;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (patch: LearnerProfileOverride) => void;
  onRestore: () => void;
}) {
  const reducedMotion = Boolean(useReducedMotion());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFrom(profile));

  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(profile));
    firstInputRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose, open, profile]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, [open]);

  const update = (field: keyof ProfileDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      name: draft.name.trim(),
      major: draft.major.trim(),
      identity: draft.identity.trim(),
      goal: draft.goal.trim(),
    });
    onClose();
  };
  const restore = () => {
    onRestore();
    onClose();
  };
  const transition = { duration: reducedMotion ? 0 : MOTION.duration.panel, ease: MOTION.ease.out };

  return <LayoutGroup id="profile-editor-morph">
    {!open && <motion.button
      ref={triggerRef}
      layoutId="profile-editor-surface"
      type="button"
      className="profile-editor-trigger"
      onClick={onOpen}
      transition={transition}
    >编辑资料</motion.button>}
    <AnimatePresence initial={false}>
      {open && <>
        <motion.div
          key="profile-editor-backdrop"
          className="learning-record-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition}
          onPointerDown={onClose}
        />
        <motion.aside
          key="profile-editor-drawer"
          layoutId="profile-editor-surface"
          className="learning-record-drawer profile-editor-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-editor-title"
          transition={transition}
        >
          <header className="learning-record-drawer__header">
            <div><span>学习者资料</span><h2 id="profile-editor-title">编辑资料</h2></div>
            <button type="button" className="learning-record-drawer__close" aria-label="关闭资料编辑" onClick={onClose}><X size={22} weight="bold" /></button>
          </header>
          <form className="profile-editor-form" onSubmit={submit}>
            <div className="profile-editor-form__fields">
              <label>
                <span>姓名</span>
                <input ref={firstInputRef} name="name" required maxLength={FIELD_LIMITS.name} value={draft.name} onChange={(event) => update('name', event.target.value)} />
                <small>{draft.name.length} / {FIELD_LIMITS.name}</small>
              </label>
              <label>
                <span>专业</span>
                <input name="major" required maxLength={FIELD_LIMITS.major} value={draft.major} onChange={(event) => update('major', event.target.value)} />
                <small>{draft.major.length} / {FIELD_LIMITS.major}</small>
              </label>
              <label>
                <span>学习阶段 / 身份</span>
                <input name="identity" required maxLength={FIELD_LIMITS.identity} value={draft.identity} onChange={(event) => update('identity', event.target.value)} />
                <small>{draft.identity.length} / {FIELD_LIMITS.identity}</small>
              </label>
              <label>
                <span>当前目标</span>
                <textarea name="goal" required rows={3} maxLength={FIELD_LIMITS.goal} value={draft.goal} onChange={(event) => update('goal', event.target.value)} />
                <small>{draft.goal.length} / {FIELD_LIMITS.goal}</small>
              </label>
            </div>
            <footer className="profile-editor-form__actions">
              <button type="button" className="profile-editor-form__restore" onClick={restore}>恢复默认</button>
              <div>
                <button type="button" onClick={onClose}>取消</button>
                <button type="submit" className="profile-editor-form__save">保存</button>
              </div>
            </footer>
          </form>
        </motion.aside>
      </>}
    </AnimatePresence>
  </LayoutGroup>;
}
