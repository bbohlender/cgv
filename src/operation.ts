import { map, Observable, OperatorFunction, filter, tap, switchMap, distinctUntilChanged, of } from "rxjs"
import {
    EventDepthMap,
    getMatrixEntryIndexKey,
    InterpretionValue,
    MatrixEntry,
    nestChanges,
    switchGroupMap,
    toArray,
    toChanges,
    Parameters,
    mergeMatrixOperators,
} from "."
import { cache } from "./cache"

export function thisParameter<T>(
    input: Observable<Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>>
): Observable<Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>> {
    return input
}

export function defaultParameterIndex(index: Array<number>): [outer: Array<number>, inner: Array<number>] {
    return [index.slice(1), [index[0]]]
}

export function maxEventDepth(maps: Array<InterpretionValue<any>>): EventDepthMap {
    const prev: any = {}
    for (const map of maps) {
        const entries = Object.entries(map.eventDepthMap)
        for (const entry of entries) {
            const [eventName, eventDepth] = entry
            if (eventDepth == null) {
                continue
            }
            const currentEventDepth = prev[eventName]
            if (currentEventDepth == null || eventDepth > currentEventDepth) {
                prev[entry[0]] = entry[1]
            }
        }
    }

    return prev
}

export function operation<Input, Output>(
    compute: (input: Array<Input>) => Observable<Array<Output>>,
    getDependencies: ((input: Array<Input>) => Array<any>) | undefined,
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<Input> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<Input> | undefined>>>
        >
    >,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    inputAmount?: Array<number>,
    debounceTime: number = 10
): OperatorFunction<
    Array<MatrixEntry<Observable<InterpretionValue<Input> | undefined>>>,
    Array<MatrixEntry<Observable<InterpretionValue<Output> | undefined>>>
> {
    //TODO: throw error when inputAmount != parameters.length
    const computeInterpretationValue: (
        input: Array<InterpretionValue<Input>> | undefined
    ) => Observable<Array<InterpretionValue<Output>>> = (input) => {
        if(input == null) {
            return of([])
        }
        const eventDepthMap = maxEventDepth(input)
        const parameters: Parameters = input.reduce((prev, cur) => ({ ...prev, ...cur.parameters }), {})
        return compute(input.map(({ value }) => value)).pipe(
            map((results) =>
                results.map<InterpretionValue<Output>>((value) => ({
                    eventDepthMap,
                    parameters,
                    terminated: false,
                    value,
                }))
            )
        )
    }

    const computeCachedValue: OperatorFunction<
        Array<InterpretionValue<Input>> | undefined,
        Array<InterpretionValue<Output>> | undefined
    > = getDependencies == null
        ? (input) => input.pipe(switchMap(computeInterpretationValue), distinctUntilChanged())
        : cache((input) => getDependencies(input.map(({ value }) => value)), computeInterpretationValue)

    return (changes) =>
        changes.pipe(
            mergeMatrixOperators(parameters),
            nestChanges(getParameterIndex, debounceTime),
            switchGroupMap(
                (change) =>
                    change.value.pipe(
                        toArray(debounceTime),
                        map((array) => parameters.length === array.length ? array : undefined),
                        computeCachedValue,
                        toChanges(),
                        map((entries) =>
                            entries.map((result) => ({
                                index: [...change.index, ...result.index],
                                value: result.value,
                            }))
                        )
                    ),
                getMatrixEntryIndexKey
            )
        )
}
