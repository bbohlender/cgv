import { defer, delay, map, merge, MonoTypeOperatorFunction, Observable, OperatorFunction, shareReplay } from "rxjs"
import {
    asChangeSet,
    changesToMatrix,
    mapMatrix,
    Matrix,
    mergeMatrixOperators,
    ParsedGrammarDefinition,
    ParsedSteps,
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
    ">": Operation<any>
    ">=": Operation<any>
    "==": Operation<any>
    "!=": Operation<any>
    if: Operation<any>
    switch: Operation<any>
    select: Operation<any>
    index: Operation<number>
    getVariable: Operation<any>
    setVariable: Operation<any>
    return: Operation<any>
    random: Operation<number>
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
    const ruleOperatorMap = new Map<
        string,
        { ref: OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>> | undefined }
    >()
    return interpreteStep<T>(rules[0], grammar, operations, ruleOperatorMap)
}

export function interpreteStep<T>(
    steps: ParsedSteps,
    grammar: ParsedGrammarDefinition,
    operations: Operations,
    ruleOperatorMap: Map<
        string,
        { ref: OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>> | undefined }
    >
): OperatorFunction<Matrix<InterpretionValue<T>>, Matrix<InterpretionValue<T>>> {
    switch (steps.type) {
        case "bracket":
            return interpreteStep(steps.steps, grammar, operations, ruleOperatorMap)
        case "operation": {
            const operation = operations[steps.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${steps.identifier}"`)
            }
            return operation(
                steps.parameters.map((parameter) => interpreteStep(parameter, grammar, operations, ruleOperatorMap))
            )
        }
        case "parallel":
            return mergeMatrixOperators(
                steps.stepsList.map((stepOfSteps) => interpreteStep(stepOfSteps, grammar, operations, ruleOperatorMap))
            )
        case "raw": {
            return (matrix) =>
                matrix.pipe(
                    map((matrix) =>
                        mapMatrix(
                            (index, value) => ({
                                ...value,
                                value: steps.value,
                            }),
                            matrix
                        )
                    )
                )
        }
        case "sequential":
            return (input) => {
                let current = input
                const terminated: Array<Observable<Matrix<InterpretionValue<T>>>> = []
                for (const stepOfSteps of steps.stepsList) {
                    const sharedCurrent = current.pipe(
                        //delay(10),
                        shareReplay({
                            refCount: true,
                            bufferSize: 1,
                        })
                    )
                    terminated.push(sharedCurrent.pipe(filterTerminated(true)))
                    current = sharedCurrent.pipe(
                        filterTerminated(false),
                        interpreteStep(stepOfSteps, grammar, operations, ruleOperatorMap)
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
            let entry = ruleOperatorMap.get(steps.identifier)
            if (entry == null) {
                const rule = grammar[steps.identifier]
                if (rule == null) {
                    throw new Error(`unknown rule "${steps.identifier}"`)
                }
                entry = { ref: undefined }
                ruleOperatorMap.set(steps.identifier, entry)
                entry.ref = interpreteStep(rule, grammar, operations, ruleOperatorMap)
            }
            return (value) => defer(() => value.pipe(entry!.ref!))
        }
    }
}

function filterTerminated<T>(terminated: boolean): MonoTypeOperatorFunction<Matrix<InterpretionValue<T>>> {
    return map((matrix) => mapMatrix((i, element) => (element.terminated === terminated ? element : undefined), matrix))
}
