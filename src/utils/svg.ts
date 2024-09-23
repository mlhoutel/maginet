function angle(A: number[], B: number[]): number {
  return Math.atan2(B[1] - A[1], B[0] - A[0]);
}

export function shortAngleDist(A: number, B: number) {
  const max = Math.PI * 2;
  const da = (B - A) % max;
  return ((2 * da) % max) - da;
}

export function getArcLength(
  C: number[],
  r: number,
  A: number[],
  B: number[]
): number {
  return (
    r *
    (2 * Math.PI) *
    (shortAngleDist(angle(C, A), angle(C, B)) / (2 * Math.PI))
  );
}

export const moveTo = (v: number[]): string => {
  return `M ${v} `;
};

export const lineTo = (...v: number[][]): string => {
  return `L ${v.join(" ")} `;
};

export const hLineTo = (v: number[]): string => {
  return `H ${v} `;
};

export const vLineTo = (v: number[]): string => {
  return `V ${v} `;
};

export const bezierTo = (A: number[], B: number[], C: number[]): string => {
  return `C ${A} ${B} ${C} `;
};

export const arcTo = (
  C: number[],
  r: number,
  A: number[],
  B: number[]
): string => {
  return [
    moveTo(A),
    "A",
    r,
    r,
    0,
    0,
    getArcLength(C, r, A, B) > 0 ? "1" : "0",
    B[0],
    B[1],
  ].join(" ");
};

export const rectTo = (A: number[]): string => {
  return `R ${A}`;
};

export const ellipse = (A: number[], r: number): string => {
  return `M ${A[0] - r},${A[1]}
        a ${r},${r} 0 1,0 ${r * 2},0
        a ${r},${r} 0 1,0 -${r * 2},0 `;
};

export const line = (a: number[], ...pts: number[][]): string => {
  return moveTo(a) + lineTo(...pts);
};

export const closePath = (): string => {
  return "Z";
};

export const getPointAtLength = (
  path: SVGPathElement,
  length: number
): number[] => {
  const point = path.getPointAtLength(length);
  return [point.x, point.y];
};

/**
 * Rotate a vector around another vector by r (radians)
 * @param A vector
 * @param C center
 * @param r rotation in radians
 */
export function rotWith(A: number[], C: number[], r: number) {
  if (r === 0) return A;

  const s = Math.sin(r);
  const c = Math.cos(r);

  const px = A[0] - C[0];
  const py = A[1] - C[1];

  const nx = px * c - py * s;
  const ny = px * s + py * c;

  return [nx + C[0], ny + C[1]];
}

/**
 * Add vectors.
 * @param A
 * @param B
 */
export function add(A: number[], B: number[]) {
  return [A[0] + B[0], A[1] + B[1]];
}

/* Vector multiplication by scalar
 * @param A
 * @param n
 */
export function mul(A: number[], n: number) {
  return [A[0] * n, A[1] * n];
}

export function med(A: number[], B: number[]) {
  return mul(add(A, B), 0.5);
}

/**
 * Vector rotation by r (radians)
 * @param A
 * @param r rotation in radians
 */
export function rot(A: number[], r: number) {
  return [
    A[0] * Math.cos(r) - A[1] * Math.sin(r),
    A[0] * Math.sin(r) + A[1] * Math.cos(r),
  ];
}

export function transformPoint(point: number[], angle: number): number[] {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [point[0] * cos - point[1] * sin, point[0] * sin + point[1] * cos];
}

export function inverseTransformPoint(
  point: number[],
  rotation: number
): number[] {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return [point[0] * cos + point[1] * sin, -point[0] * sin + point[1] * cos];
}
