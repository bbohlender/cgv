import { distinctUntilChanged, map, Observable, of, tap } from "rxjs"
import { toArray, Operation, InterpretionValue, maxEventDepth, nestChanges, uncompleteOf } from "../.."
import { cache } from "../../cache"

function computeSum(values: Array<InterpretionValue<number>>): Observable<InterpretionValue<number>> {
    return uncompleteOf(
        values.reduce<InterpretionValue<number>>(
            (prev, cur) => {
                prev.value += cur.value
                maxEventDepth(prev.eventDepthMap, cur.eventDepthMap)
                return prev
            },
            { eventDepthMap: {}, value: 0 }
        )
    )
}

const sum: Operation<number> = (changes) =>
    nestChanges(changes, (index) => [index.slice(1), index.slice(0, 1)], 100).pipe(
        map((outerChanges) =>
            outerChanges.map((outerChange) => ({
                index: outerChange.index,
                value: toArray(outerChange.value, 100).pipe(
                    cache((values) => values.map(({ value }) => value), computeSum),
                    distinctUntilChanged()
                ),
            }))
        )
    )

export const operations = {
    sum,
}
