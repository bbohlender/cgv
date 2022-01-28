import { map, Observable, OperatorFunction, filter, tap } from "rxjs"
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
    mergeMatrixOperatorsIV,
} from "."
import { cache } from "./cache"

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
    getDependencies: (input: Array<Input>) => Array<any>,
    clone: (value: Input, index: number) => Input, //TODO: remove
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<Input> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<Input> | undefined>>>
        >
    >,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    inputAmount?: number,
    debounceTime: number = 10
): OperatorFunction<
    Array<MatrixEntry<Observable<InterpretionValue<Input> | undefined>>>,
    Array<MatrixEntry<Observable<InterpretionValue<Output> | undefined>>>
> {
    const computeInterpretationValue: (
        input: Array<InterpretionValue<Input>>
    ) => Observable<Array<InterpretionValue<Output>>> = (input) => {
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
    const computeDependencies: (input: Array<InterpretionValue<Input>>) => Array<any> = (input) =>
        getDependencies(input.map(({ value }) => value))

    return (changes) =>
        changes.pipe(
            mergeMatrixOperatorsIV(clone, parameters),
            nestChanges(getParameterIndex, debounceTime),
            switchGroupMap(
                (change) =>
                    change.value.pipe(
                        toArray(debounceTime),
                        filter((array) => inputAmount == null || array.length === inputAmount),
                        cache<Array<InterpretionValue<Input>>, Array<InterpretionValue<Output>>>(
                            computeDependencies,
                            computeInterpretationValue
                        ),
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
