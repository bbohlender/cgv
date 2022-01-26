import { of, tap } from "rxjs"
import { Operation, operation } from "../.."

function computeSum(values: Array<number>) {
    return of([values.reduce<number>((prev, cur) => prev + cur, 0)])
}

const sum: Operation<number> = (changes) =>
    changes.pipe(
        operation(computeSum, (values) => values)
    )

export const operations = {
    sum,
}
