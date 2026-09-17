/**
 * Pico.glb 实测结果（gltf-transform inspect，优化后资产）：
 * 单 mesh `node_0`；无动画；**没有**独立的 face/screen/display mesh。
 * bbox min(-0.58649, 0, -0.59143) → max(0.58201, 1.17036, 0.57279)
 *
 * 由此确定的模型事实：
 * - 原点在脚底（y=0），不是几何中心 → 必须靠 visualOffset 把中心搬到画面中心
 * - 正面为 +Z（相机在 +Z 侧），前表面 z≈0.573
 * - 高度 1.17036
 *
 * 下面的数值全部由该 bbox 推导，再经浏览器截图校准，**不要凭感觉改**。
 * 相机参数也集中在此，避免 scale 与 fov/距离互相打架。
 */

export interface PicoCalibration {
  visualScale: number;
  visualOffset: [number, number, number];
  facePosition: [number, number, number];
  faceRotation: [number, number, number];
  faceSize: [number, number];
}

export const PICO_CAMERA = {
  position: [0, 0.25, 3.1] as [number, number, number],
  fov: 30,
};

const MODEL_HEIGHT = 1.17036;
const MODEL_CENTER_Y = 0.58518;
const MODEL_FRONT_Z = 0.57279;

/** 目标：模型在 Actor 画布内占高度约 82%（验收要求 78–86%）。 */
const TARGET_FILL = 0.82;
const VISIBLE_HEIGHT = 2 * PICO_CAMERA.position[2] * Math.tan((PICO_CAMERA.fov / 2) * (Math.PI / 180));
const VISUAL_SCALE = TARGET_FILL * VISIBLE_HEIGHT / MODEL_HEIGHT;

export const PICO_CALIBRATION: PicoCalibration = {
  // 1.05 → 约 1.16：原值只占 74%，低于验收下限。
  visualScale: VISUAL_SCALE,
  // 模型中心搬到画面中心；子物体先 scale 后平移，所以偏移量要乘 scale。
  visualOffset: [0, -MODEL_CENTER_Y * VISUAL_SCALE, 0],
  // 脸从模型高度 24% 抬到 65%，并浮出前表面（原 z=0.54 < 0.573 导致被模型自遮挡）。
  facePosition: [0, MODEL_HEIGHT * 0.65, MODEL_FRONT_Z + 0.05],
  faceRotation: [0, 0, 0],
  faceSize: [0.44, 0.22],
};
