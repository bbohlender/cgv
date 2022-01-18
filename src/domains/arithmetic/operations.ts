import { map, Observable, tap } from "rxjs"
import { toArray, Operation, InterpretionValue, maxEventDepth, nestChanges, MatrixEntry } from "../.."

//TODO: caching (by declaring and comparing dependencies)

const sum: Operation<number> = (changes) =>
    nestChanges(changes, (index) => [index.slice(1), index.slice(0, 1)], 100).pipe(
        map((outerChanges) =>
            outerChanges.map((outerChange) => ({
                index: outerChange.index,
                value: toArray(outerChange.value, 100).pipe(
                    map((values) =>
                        values.reduce<InterpretionValue<number>>(
                            (prev, cur) => {
                                prev.value += cur.value
                                maxEventDepth(prev.eventDepthMap, cur.eventDepthMap)
                                return prev
                            },
                            { eventDepthMap: {}, value: 0 }
                        )
                    )
                ),
            }))
        )
    )

export const operations = {
    sum,
}
