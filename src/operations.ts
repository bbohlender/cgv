import { map, Observable, OperatorFunction, filter, tap } from "rxjs"
import { getIndexKey, MatrixEntry, nestChanges, switchGroupMap, toArray, toChanges } from "."
import { cache } from "./cache"

function defaultParameterIndex(index: Array<number>): [outer: Array<number>, inner: Array<number>] {
    return [index.slice(1, 2), [...index.slice(0, 1), ...index.slice(2)]
}

export function operation<Input, Output>(
    compute: (input: Array<Input>) => Observable<Array<Output>>,
    getDependencies: (input: Array<Input>) => Array<any>,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    inputAmount?: number,
    debounceTime: number = 10,
    log?: boolean
): OperatorFunction<
    Array<MatrixEntry<Observable<Input | undefined>>>,
    Array<MatrixEntry<Observable<Output | undefined>>>
> {
    return (changes: Observable<Array<MatrixEntry<Observable<Input | undefined>>>>) =>
        changes.pipe(
            nestChanges(getParameterIndex, debounceTime, log ?? false),
            switchGroupMap<
                MatrixEntry<Observable<Array<MatrixEntry<Observable<Input | undefined>>> | undefined>>,
                Array<MatrixEntry<Observable<Output | undefined>>>,
                string
            >(
                (change) =>
                    change.value.pipe(
                        toArray(debounceTime),
                        filter((array) => inputAmount == null || array.length === inputAmount),
                        cache(getDependencies, compute),
                        toChanges(),
                        map((entries) =>
                            entries.map((result) => ({
                                index: [...change.index, ...result.index],
                                value: result.value,
                            }))
                        )
                    ),
                getIndexKey
            )
        )
}
