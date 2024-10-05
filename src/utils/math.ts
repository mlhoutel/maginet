export function sub(a: number[], b: number[]): number[] {
  return [a[0] - b[0], a[1] - b[1]];
}

export function add(a: number[], b: number[]): number[] {
  return [a[0] + b[0], a[1] + b[1]];
}
export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}
export function shuffle<T>(array: T[]) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}
