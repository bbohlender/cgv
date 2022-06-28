export const EPSILON = 0.001

export function almostTheSame(v1: number, v2: number): boolean {
    return Math.abs(v1 - v2) < EPSILON
}
