# Design reference sources

This directory contains shallow clones used for design and implementation research. It is not part of the application runtime and must not be bundled into production builds.

## Design and agent guidance

- `taste-skill`: anti-template frontend design guidance.
- `impeccable`: UI audit rules and agent workflow reference.
- `ui-ux-pro-max-skill`: searchable UI/UX knowledge reference.
- `awesome-design-md`: design-system analyses and composition references.
- `gsap-skills`: GSAP usage and cleanup guidance.
- `ponytail`: project-agent minimalism rules and review skills. It is development guidance, not a browser runtime dependency; the iTeach-specific subset is enforced by the root `AGENTS.md`.

## Runtime implementation references

- `GSAP`: timeline and JavaScript animation reference.
- `motion`: DOM state-transition and gesture reference. The application already uses the published `motion` package.
- `anime`: alternative JavaScript/Three.js animation reference.
- `lottie-web`: Lottie playback reference, only useful when an approved animation JSON asset exists.
- `inspira-ui`: Vue/Nuxt visual reference only. Its components are not compatible with this React application.

## Curriculum graph reference

- `os-taxonomy`: Marble's open curriculum dataset and schema reference. Use its stable IDs, hard/soft prerequisite edges, evidence fields, provenance, and validation discipline as modeling references only. Do not copy its primary-school content, age-axis layout, or licensed text into the iTeach production dataset.

## Project dependency policy

- Do not import source files directly from this directory.
- Do not ship multiple libraries that animate the same DOM or Three.js property.
- Keep Motion for DOM UI transitions.
- Keep R3F and CameraControls responsible for Three.js scene and camera state unless a later design decision explicitly selects one timeline engine.
- Treat visual references as methods, not as permission to copy third-party brand assets or proprietary typography.
