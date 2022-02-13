import { combineLatest, defer, map, Observable, of, OperatorFunction, startWith, tap, throwError } from "rxjs"
import { mapMatrix, Matrix, ParsedGrammarDefinition, ParsedStep, shareReplayMatrix } from "."

export type EventDepthMap = Readonly<{ [identifier in string]?: number }>

export type Parameters = Readonly<{ [identifier in string]?: Observable<any> }>

export type Operation<T> = (
    parameters: Array<
        OperatorFunction<Matrix<Observable<InterpretionValue<T>>>, Matrix<Observable<InterpretionValue<T>>>>
    >
) => OperatorFunction<Matrix<Observable<InterpretionValue<T>>>, Matrix<Observable<InterpretionValue<T>>>>

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
} & {
    [name in string]?: Operation<any>
}

export type InterpretionValue<T> = Readonly<{
    value: T
    eventDepthMap: EventDepthMap
    //terminated: boolean
    parameters: Parameters
}>

export function interprete<T>(
    grammar: ParsedGrammarDefinition,
    operations: Operations
): OperatorFunction<Matrix<Observable<InterpretionValue<T>>>, Matrix<Observable<InterpretionValue<T>>>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return (input) => input
    }
    return interpreteStep<T>(rules[0], grammar, operations)
}

export function mergeMatrixOperators<T, K = T>(
    operators: Array<OperatorFunction<Matrix<Observable<T>>, Matrix<Observable<K>>>>
): OperatorFunction<Matrix<Observable<T>>, Matrix<Observable<K>>> {
    return (observable) => {
        const shared = observable.pipe(shareReplayMatrix({ refCount: true, bufferSize: 1 }))
        return combineLatest(operators.map((operator) => shared.pipe(operator, startWith<Matrix<Observable<K>>>([]))))
    }
}

export function interpreteStep<T>(
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations
): OperatorFunction<Matrix<Observable<InterpretionValue<T>>>, Matrix<Observable<InterpretionValue<T>>>> {
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
            const value = of({
                eventDepthMap: {},
                terminated: false,
                value: step.value,
                parameters: {},
            })
            return map((matrix) => mapMatrix(matrix, () => value))
        }
        case "sequential":
            return (input) => {
                let current = input
                //const terminated: Array<MatrixEntriesObservable<InterpretionValue<T> | undefined>> = []
                //TODO
                for (const stepOfSteps of step.steps) {
                    current = current.pipe(interpreteStep(stepOfSteps, grammar, operations))
                }

                return current
            }
        case "this":
            return (input) => input
        case "return":
            return map((matrix) =>
                mapMatrix(matrix, (value) => value.pipe(map((value) => ({ ...value, terminated: true }))))
            )
        case "symbol": {
            const rule = grammar[step.identifier]
            if (rule == null) {
                return () => throwError(() => new Error(`unknown rule "${step.identifier}"`))
            }
            return (input) => defer(() => input.pipe(interpreteStep(rule, grammar, operations)))
        }
    }
}
