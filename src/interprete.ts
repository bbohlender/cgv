import {
    combineLatest,
    defer,
    map,
    merge,
    MonoTypeOperatorFunction,
    Observable,
    OperatorFunction,
    shareReplay,
    throwError,
} from "rxjs"
import {
    asChangeSet,
    changesToMatrix,
    ChangeType,
    filterMatrix,
    mapMatrix,
    Matrix,
    MatrixChangeSet,
    ParsedGrammarDefinition,
    ParsedStep,
} from "."

export type EventDepthMap = Readonly<{ [identifier in string]?: number }>

export type Parameters = Readonly<{ [identifier in string]?: Observable<any> }>

export type Operation<T> = (
    parameters: Array<OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>>
) => OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>>

export type Operations = {
    "+": Operation<number>
    "-": Operation<number>
    "/": Operation<number>
    "*": Operation<number>
    "%": Operation<number>
    "!-": Operation<number>
    "!": Operation<boolean>
    "&&": Operation<boolean>
    "||": Operation<number>
    "<": Operation<any>
    "<=": Operation<any>
    "==": Operation<any>
    "!=": Operation<any>
    if: Operation<any>
    switch: Operation<any>
    select: Operation<any>
    index: Operation<number>
    getVariable: Operation<any>
    setVariable: Operation<any>
    return: Operation<any>
} & {
    [name in string]?: Operation<any>
}

export type InterpretionValue<T> = Readonly<{
    value: T
    eventDepthMap: EventDepthMap
    terminated: boolean
    parameters: Parameters
}>

export function interprete<T>(
    grammar: ParsedGrammarDefinition,
    operations: Operations
): OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return (input) => input
    }
    return interpreteStep<T>(rules[0], grammar, operations)
}

export function combineVersioned<T>(matrices: Array<Observable<Matrix<InterpretionValue<T>>>>) {
    merge()
}

export function setVersion<T>(): OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>> {
    let version = 0
    return map((matrix) => mapMatrix(matrix, (value) => ({ ...value, version: version++ })))
}

export function mergeMatrixOperators<T, K = T>(
    operators: Array<OperatorFunction<T, Matrix<K>>>
): OperatorFunction<T, Matrix<K>> {
    return (observable) => {
        const shared = observable.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return merge(...operators.map((operator, i) => shared.pipe(operator, asChangeSet([i])))).pipe(
            changesToMatrix<Matrix<K>>()
        )
    }
}

export function interpreteStep<T>(
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations
): OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>> {
    switch (step.type) {
        case "operation": {
            const operation = operations[step.identifier]
            if (operation == null) {
                return () => throwError(() => new Error(`unknown operation "${step.identifier}"`))
            }
            return operation(step.parameters.map((parameter) => interpreteStep(parameter, grammar, operations)))
        }
        case "parallel":
            return mergeMatrixOperators(
                step.steps.map((stepOfSteps) => interpreteStep(stepOfSteps, grammar, operations))
            )
        case "raw": {
            const value: InterpretionValue<T> = {
                eventDepthMap: {},
                terminated: false,
                value: step.value,
                parameters: {},
            }
            return (matrix) => matrix.pipe(map((matrix) => mapMatrix(matrix, () => value)))
        }
        case "sequential":
            return (input) => {
                let current = input
                const terminated: Array<Observable<Matrix<InterpretionValue<T>>>> = []
                for (const stepOfSteps of step.steps) {
                    const sharedCurrent = current.pipe(
                        shareReplay({
                            refCount: true,
                            bufferSize: 1,
                        })
                    )
                    terminated.push(sharedCurrent.pipe(filterTerminated(true)))
                    current = sharedCurrent.pipe(
                        filterTerminated(false),
                        interpreteStep(stepOfSteps, grammar, operations)
                    )
                    //TODO: think of ways to reduce the amount of "doubles" through splitting
                }

                return merge(...[current, ...terminated].map((matrix, i) => matrix.pipe(asChangeSet([i])))).pipe(
                    changesToMatrix<Matrix<InterpretionValue<T>>>()
                )
            }
        case "this":
            return (input) => input
        case "symbol": {
            const rule = grammar[step.identifier]
            if (rule == null) {
                return () => throwError(() => new Error(`unknown rule "${step.identifier}"`))
            }
            return (input) => defer(() => input.pipe(interpreteStep(rule, grammar, operations)))
        }
    }
}

function filterTerminated<T>(terminated: boolean): MonoTypeOperatorFunction<Matrix<InterpretionValue<T>>> {
    return map((matrix) => filterMatrix(matrix, (element) => element.terminated === terminated))
}
