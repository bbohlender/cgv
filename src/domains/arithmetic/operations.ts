import { map, tap } from "rxjs"
import { toArray, Operation, toChanges, InterpretionValue, maxEventDepth } from "../.."

//TODO: debounce and buffer changes
//TODO: check dependencies
//TODO: caching

const sum: Operation<number> = (values) =>
    toChanges(
        toArray(values).pipe(
            map((values) => [
                values.reduce<InterpretionValue<number>>(
                    (prev, cur) => {
                        prev.value += cur.value
                        maxEventDepth(prev.eventDepthMap, cur.eventDepthMap)
                        return prev
                    },
                    { eventDepthMap: {}, value: 0 }
                ),
            ])
        )
    )

export const operations = {
    sum,
}
