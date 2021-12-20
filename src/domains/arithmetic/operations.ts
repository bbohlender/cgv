import { Operation } from "../.."

export const sum: Operation<number> = (...values) => [
    values.reduce((v1, v2) => v1 + v2, 0),
]
