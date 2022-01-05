import { Operation } from "../.."

const sum: Operation<number> = (...values) => [
    values.reduce((v1, v2) => v1 + v2, 0),
]

export const operations = {
    sum
}
