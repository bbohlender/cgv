import { Operation } from "../.."

const sum: Operation<number> = (...waitValues) => [
    async () => {
        const values = await Promise.all(waitValues.map((v) => v()))
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return values.reduce((v1, v2) => v1 + v2, 0)
    },
]

export const operations = {
    sum,
}
