import { distinctUntilChanged, map, mergeMap, Observable, OperatorFunction, merge, filter } from "rxjs"
import { MatrixEntry, nestChanges, toArray } from "."
import { cache } from "./cache"

function defaultParameterIndex(index: Array<number>): [outer: Array<number>, inner: Array<number>] {
    return [index.slice(1), index.slice(0, 1)]
}

export type OperationComputation<Input, Output> = (
    input: Array<Input>
) => Observable<Array<MatrixEntry<Observable<Output>>>>

export function operation<Input, Output>(
    compute: OperationComputation<Input, Output>,
    getDependencies: (input: Array<Input>) => Array<any>,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    inputAmount?: number,
    debounceTime: number = 10
): OperatorFunction<Array<MatrixEntry<Observable<Input>>>, Array<MatrixEntry<Observable<Output>>>> {
    return (changes: Observable<Array<MatrixEntry<Observable<Input>>>>) =>
        changes.pipe(
            nestChanges(getParameterIndex, debounceTime),
            mergeMap((outerChanges) =>
                merge(
                    ...outerChanges.map((outerChange) =>
                        outerChange.value.pipe(
                            toArray(debounceTime),
                            filter((array) => inputAmount == null || array.length === inputAmount),
                            cache(getDependencies, compute),
                            distinctUntilChanged(),
                            map((changes) =>
                                changes.map((change) => ({
                                    index: [...outerChange.index, ...change.index],
                                    value: change.value,
                                }))
                            )
                        )
                    )
                )
            )
        )
}
