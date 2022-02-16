import { map, Observable, OperatorFunction, switchMap, of } from "rxjs"
import {
    EventDepthMap,
    InterpretionValue,
    nestMatrix,
    Parameters,
    mergeMatrixOperators,
    Matrix,
    changesToMatrix,
    debounceBufferTime,
    matrixToArray,
    switchAllMatrixChanges,
    mapMatrix,
} from "."
import { cache } from "./cache"

export function thisParameter<T>(
    input: Observable<Matrix<InterpretionValue<T>>>
): Observable<Matrix<InterpretionValue<T>>> {
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
    compute: (input: Array<Input>) => Observable<Matrix<Output>>,
    getDependencies: ((input: Array<Input>) => Array<any>) | undefined,
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<Input>>, Matrix<InterpretionValue<Input>>>>,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    inputAmount?: Array<number>,
    debounceTime = 10
): OperatorFunction<Matrix<InterpretionValue<Input>>, Matrix<InterpretionValue<Output>>> {
    //TODO: throw error when inputAmount != parameters.length
    const computeInterpretationValue: (
        input: Array<InterpretionValue<Input>> | undefined
    ) => Observable<Matrix<InterpretionValue<Output>>> = (input) => {
        if (input == null) {
            return of([])
        }
        const eventDepthMap = maxEventDepth(input)
        const parameters: Parameters = input.reduce((prev, cur) => ({ ...prev, ...cur.parameters }), {})
        return compute(input.map(({ value }) => value)).pipe(
            map((results) =>
                mapMatrix(results, (value) => ({
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
        Matrix<InterpretionValue<Output>> | undefined
    > =
        getDependencies == null
            ? (input) => input.pipe(switchMap(computeInterpretationValue))
            : cache((input) => getDependencies(input.map(({ value }) => value)), computeInterpretationValue)

    return (matrix) =>
        matrix.pipe(
            mergeMatrixOperators(parameters),
            nestMatrix<InterpretionValue<Input>>(getParameterIndex),
            map((change) => ({
                ...change,
                value: change.value.pipe(
                    matrixToArray(),
                    map((array) => (parameters.length === array.length ? array : undefined)),
                    computeCachedValue,
                    map((value) => (value == null ? [] : value))
                ),
            })),
            debounceBufferTime(debounceTime),
            switchAllMatrixChanges(debounceTime),
            changesToMatrix<Matrix<InterpretionValue<Output>>>()
        )
}
