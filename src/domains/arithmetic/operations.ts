import { map } from "rxjs"
import { flatten, Operation } from "../.."

const sum: Operation<number> = (values) =>
    flatten(values).pipe(map((values) => [values.reduce((v1, v2) => v1 + v2, 0)]))

export const operations = {
    sum,
}
