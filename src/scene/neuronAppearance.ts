import type { NodeType, VisualState } from '../graph/types';

const SIZE: Record<NodeType, number> = { goal: 42, direction: 34, course: 30, skill: 28, knowledge: 23, practice: 20 };
const STRENGTH: Record<VisualState, number> = {
  dormant: 0.7, contextual: 0.95, lensActive: 1.05, upstream: 1.1,
  downstream: 1.05, lateral: 0.9, selected: 1.3, recommendedPath: 1.1, searchMatch: 1.2,
};

export function neuronAppearance(type: NodeType, state: VisualState, hovered = false) {
  return {
    size: SIZE[type] * (state === 'selected' ? 1.35 : hovered ? 1.2 : 1),
    strength: Math.max(STRENGTH[state], hovered ? 1.2 : 0),
  };
}

// A bounded screen-space corona: zoom changes depth, never turns a node into a solid planet.
export const neuronVertexShader = `
  attribute float aSize;
  attribute float aStrength;
  uniform float uDpr;
  varying vec3 vColor;
  varying float vStrength;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float depthScale = clamp(60.0 / max(1.0, -viewPosition.z), 0.65, 1.6);
    gl_PointSize = min(aSize * depthScale, 76.0) * uDpr;
    gl_Position = projectionMatrix * viewPosition;
    vColor = color;
    vStrength = aStrength;
  }
`;

// Inspira NeuralBg/AnimatedBeam inspired contrast: bright junctions, soft falloff, quiet paths.
// Independent implementation, no texture asset or additional render engine.
export const neuronFragmentShader = `
  varying vec3 vColor;
  varying float vStrength;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float nucleus = exp(-r * r * 300.0);
    float corona = exp(-r * 10.0) * 0.36 * (1.0 - smoothstep(0.35, 0.5, r));
    vec3 light = mix(vColor, vec3(1.7), nucleus);
    gl_FragColor = vec4(light, (nucleus + corona) * vStrength);
  }
`;
