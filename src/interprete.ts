import {
    defer,
    distinctUntilChanged,
    map,
    MonoTypeOperatorFunction,
    Observable,
    of,
    OperatorFunction,
    throwError,
} from "rxjs"
import {
    MatrixEntry,
    MatrixEntriesObservable,
    mergeMatrices,
    ParsedEventDefintion,
    ParsedGrammarDefinition,
    ParsedStep,
    deepShareReplay,
} from "."

export type EventDepthMap = Readonly<{ [identifier in string]?: number }>

export type Parameters = Readonly<{ [identifier in string]?: Observable<any> }>

export type Operation<T> = (
    parameters: Array<
        OperatorFunction<
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
            Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
        >
    >
) => OperatorFunction<
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
>

export type Operations<T> = {
    [name in string]: Operation<T>
}

export type InterpretionValue<T> = Readonly<{
    value: T
    eventDepthMap: EventDepthMap
    terminated: boolean
    parameters: Parameters
}>

export function interprete<T>(
    input: MatrixEntriesObservable<InterpretionValue<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MatrixEntriesObservable<InterpretionValue<T>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return input
    }
    const eventScheduler = null as any //generateEventScheduler<T>()
    return input.pipe(interpreteStep(rules[0], grammar, operations, eventScheduler))
}

export function mergeMatrixOperators<T, K = T>(
    operators: Array<
        OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>>, Array<MatrixEntry<Observable<K | undefined>>>>
    >
): OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>>, Array<MatrixEntry<Observable<K | undefined>>>> {
    return (observable) => {
        if (Array.isArray(operators)) {
            const shared = observable.pipe(deepShareReplay({ refCount: true }))
            return mergeMatrices(operators.map((operator) => shared.pipe(operator)))
        }
        return observable.pipe(operators)
    }
}

export function interpreteStep<T>(
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    eventScheduler: (
        identifier: string,
        event: ParsedEventDefintion,
        input: MatrixEntriesObservable<InterpretionValue<T>>
    ) => MatrixEntriesObservable<InterpretionValue<T>>
): OperatorFunction<
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
> {
    switch (step.type) {
        case "operation": {
            const operation = operations[step.identifier]
            if (operation == null) {
                return () => throwError(() => new Error(`unknown operation "${step.identifier}"`))
            }
            const appliedOperation = operation(
                step.parameters.map((parameter) => interpreteStep(parameter, grammar, operations, eventScheduler))
            )
            return (input) => input.pipe(appliedOperation)
        }
        case "parallel":
            return mergeMatrixOperators(
                step.steps.map((stepOfSteps) => interpreteStep(stepOfSteps, grammar, operations, eventScheduler))
            )
        case "raw": {
            const value = of({
                eventDepthMap: {},
                terminated: false,
                value: step.value,
                parameters: {},
            })
            return (input) =>
                input.pipe(
                    map((changes) =>
                        changes.map<MatrixEntry<Observable<InterpretionValue<T>>>>((change) => ({
                            ...change,
                            value,
                        }))
                    )
                )
        }
        case "sequential":
            //TODO: this can be improved?
            return (input) => {
                let current = input
                const terminated: Array<MatrixEntriesObservable<InterpretionValue<T> | undefined>> = []
                for (const stepOfSteps of step.steps) {
                    const sharedCurrent = current.pipe(
                        deepShareReplay({
                            //TODO: buffer Size unlimited (bad)
                            refCount: true,
                        })
                    )
                    terminated.push(sharedCurrent.pipe(useWhenTerminatedIs(true)))
                    current = sharedCurrent.pipe(
                        useWhenTerminatedIs(false),
                        interpreteStep(stepOfSteps, grammar, operations, eventScheduler)
                    )
                    //TODO: think of ways to reduce the amount of "doubles" through splitting
                    //maybe implement sequential through a nextSteps parameters, which are then just cleared?
                }

                return mergeMatrices([current, ...terminated])
            }
        case "this":
            return (input) => input
        case "symbol": {
            const rule = grammar[step.identifier]
            if (rule == null) {
                return () => throwError(() => new Error(`unknown rule "${step.identifier}"`))
            }
            return (input) => defer(() => input.pipe(interpreteStep(rule, grammar, operations, eventScheduler)))
        }
    }
}

function useWhenTerminatedIs<T>(
    terminated: boolean
): MonoTypeOperatorFunction<Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>> {
    return map((changes) =>
        changes.map((change) => ({
            index: change.index,
            value: change.value.pipe(
                map((value) => (value?.terminated === terminated ? value : undefined)),
                distinctUntilChanged()
            ),
        }))
    )
}
