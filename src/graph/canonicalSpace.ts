/** 全站唯一的 canonical 坐标定义：Universe、系统知识树、预览共用同一套缩放。 */
export const SPACE_SCALE = [1.22, 1.08, 1.22] as const;

export type Position3 = readonly [number, number, number];

export function canonicalPosition(
  position: Position3,
): [number, number, number] {
  return [
    position[0] * SPACE_SCALE[0],
    position[1] * SPACE_SCALE[1],
    position[2] * SPACE_SCALE[2],
  ];
}

export function canonicalPositionMap<
  T extends { id: string; position: [number, number, number] },
>(points: readonly T[]) {
  return new Map(
    points.map((point) => [
      point.id,
      canonicalPosition(point.position),
    ]),
  );
}
