import { map, Observable, OperatorFunction, switchMap, distinctUntilChanged, of, tap } from "rxjs"
import {
    EventDepthMap,
    InterpretionValue,
    nestMatrix,
    Parameters,
    mergeMatrixOperators,
    Matrix,
    switchAllArray,
    changesToMatrix,
    debounceBufferTime,
    switchAllMatrix,
    tapMatrix,
} from "."
import { cache } from "./cache"

export function thisParameter<T>(
    input: Observable<Matrix<Observable<InterpretionValue<T>>>>
): Observable<Matrix<Observable<InterpretionValue<T>>>> {
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
        OperatorFunction<Matrix<Observable<InterpretionValue<Input>>>, Matrix<Observable<InterpretionValue<Input>>>>
    >,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    inputAmount?: Array<number>,
    debounceTime = 10
): OperatorFunction<Matrix<Observable<InterpretionValue<Input>>>, Matrix<Observable<InterpretionValue<Output>>>> {
    //TODO: throw error when inputAmount != parameters.length
    const computeInterpretationValue: (
        input: Array<InterpretionValue<Input>> | undefined
    ) => Observable<Array<Observable<InterpretionValue<Output>>>> = (input) => {
        if (input == null) {
            return of([])
        }
        const eventDepthMap = maxEventDepth(input)
        const parameters: Parameters = input.reduce((prev, cur) => ({ ...prev, ...cur.parameters }), {})
        return compute(input.map(({ value }) => value)).pipe(
            map((results) =>
                results.map<Observable<InterpretionValue<Output>>>((value) =>
                    of({
                        eventDepthMap,
                        parameters,
                        terminated: false,
                        value,
                    })
                )
            )
        )
    }

    const computeCachedValue: OperatorFunction<
        Array<InterpretionValue<Input>> | undefined,
        Array<Observable<InterpretionValue<Output>>> | undefined
    > =
        getDependencies == null
            ? (input) => input.pipe(switchMap(computeInterpretationValue), distinctUntilChanged())
            : cache((input) => getDependencies(input.map(({ value }) => value)), computeInterpretationValue)

    return (matrix) =>
        matrix.pipe(
            tapMatrix(),
            mergeMatrixOperators(parameters),
            nestMatrix<InterpretionValue<Input>>(getParameterIndex),
            map((change) => ({
                ...change,
                value: change.value.pipe(
                    switchAllArray(debounceTime),
                    map((array) => (parameters.length === array.length ? array : undefined)),
                    computeCachedValue,
                    map((value) => (value == null ? [] : value))
                ),
            })),
            debounceBufferTime(debounceTime),
            changesToMatrix(),
            switchAllMatrix(debounceTime)
        )
}
