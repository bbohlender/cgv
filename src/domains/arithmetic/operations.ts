import { of } from "rxjs"
import { Operation, InterpretionValue, maxEventDepth, operation } from "../.."

function computeSum(values: Array<InterpretionValue<number>>) {
    return of([
        {
            eventDepthMap: maxEventDepth(...values.map(({ eventDepthMap }) => eventDepthMap)),
            value: values.reduce<number>((prev, cur) => prev + cur.value, 0),
            terminated: false,
        },
    ])
}

const sum: Operation<number> = (changes) =>
    changes.pipe(operation(computeSum, (values) => values.map(({ value }) => value)))

export const operations = {
    sum,
}
