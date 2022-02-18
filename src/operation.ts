import { map, Observable, OperatorFunction, switchMap, of } from "rxjs"
import {
    EventDepthMap,
    InterpretionValue,
    nestMatrix,
    Parameters,
    mergeMatrixOperators,
    Matrix,
    changesToMatrix,
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

export function operationInterpretion<Input, Output>(
    compute: (input: Array<Input>) => Observable<Matrix<Output>>,
    getDependencies: ((input: Array<Input>) => Array<any>) | undefined,
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<Input>>, Matrix<InterpretionValue<Input>>>>,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    debounceTime = 0
): OperatorFunction<Matrix<InterpretionValue<Input>>, Matrix<InterpretionValue<Output>>> {

    const computeInterpretationValue: (
        input: Array<InterpretionValue<Input>>
    ) => Observable<Matrix<InterpretionValue<Output>>> = (input) => {
        const eventDepthMap = maxEventDepth(input)
        const parameters: Parameters = input.reduce((prev, cur) => ({ ...prev, ...cur.parameters }), {})
        return compute(input.map(({ value }) => value)).pipe(
            map((results) =>
                mapMatrix(
                    (i, value) => ({
                        eventDepthMap,
                        parameters,
                        terminated: false,
                        value,
                    }),
                    results
                )
            )
        )
    }

    return operation(
        computeInterpretationValue,
        getDependencies == null ? undefined : (input) => getDependencies(input.map(({ value }) => value)),
        parameters,
        getParameterIndex,
        debounceTime
    )
}

//TODO: save the amount of parameters on the operator (and type?) so that this can be checked on parsing

export function operation<Input, Output>(
    compute: (input: Array<Input>) => Observable<Matrix<Output>>,
    getDependencies: ((input: Array<Input>) => Array<any>) | undefined,
    parameters: Array<OperatorFunction<Matrix<Input>, Matrix<Input>>>,
    getParameterIndex: (index: Array<number>) => [outer: Array<number>, inner: Array<number>] = defaultParameterIndex,
    debounceTime = 0
): OperatorFunction<Matrix<Input>, Matrix<Output>> {
    //TODO: throw error when inputAmount != parameters.length

    const computeCachedValue: OperatorFunction<Array<Input> | undefined, Matrix<Output>> =
        getDependencies == null
            ? (input) => input.pipe(switchMap((val) => (val == null ? of<Matrix<Output>>(undefined) : compute(val))))
            : cache(
                  (input) => getDependencies(input),
                  (val) => (val == null ? of<Matrix<Output>>(undefined) : compute(val))
              )

    return (matrix) =>
        matrix.pipe(
            mergeMatrixOperators(parameters),
            nestMatrix<Input>(getParameterIndex),
            map((change) => ({
                ...change,
                value: change.value.pipe(
                    matrixToArray(),
                    map((array) => (parameters.length === array.length ? array : undefined)),
                    computeCachedValue
                ),
            })),
            switchAllMatrixChanges(debounceTime),
            changesToMatrix<Matrix<Output>>()
        )
}
