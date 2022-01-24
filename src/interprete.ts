import { defer, distinctUntilChanged, map, MonoTypeOperatorFunction, Observable, of, OperatorFunction, tap } from "rxjs"
import {
    MatrixEntry,
    MatrixEntriesObservable,
    mergeMatrices,
    ParsedEventDefintion,
    ParsedGrammarDefinition,
    ParsedStep,
    generateEventScheduler,
    deepShareReplay,
} from "."

export type EventDepthMap = { [identifier in string]?: number }

export type Operation<T> = OperatorFunction<
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>,
    Array<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>
>

export type Operations<T> = {
    [name in string]: Operation<T>
}

export type InterpretionValue<T> = {
    value: T
    eventDepthMap: EventDepthMap
    terminated: boolean
    //TODO: parameters (scoped variables accessible through this.[parameterName])
}

export function interprete<T>(
    input: MatrixEntriesObservable<T>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T
): MatrixEntriesObservable<T> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return input
    }
    const eventScheduler = generateEventScheduler<T>()
    return input.pipe(
        map((changes) =>
            changes.map<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>((change) => ({
                ...change,
                value: change.value.pipe(
                    map((value) => (value != null ? { value, eventDepthMap: {}, terminated: false } : undefined))
                ),
            }))
        ),
        interpreteStep(rules[0], grammar, operations, clone, eventScheduler),
        map((changes) =>
            changes.map((change) => ({
                ...change,
                value: change.value.pipe(map((val) => val?.value)),
            }))
        )
    )
}

//TODO: combine clone, with clone from cache

export function interpreteStep<T>(
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T,
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
        case "operation":
            const operation = operations[step.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${step.identifier}"`)
            }
            return (input) =>
                input.pipe(interpreteStep(step.parameters, grammar, operations, clone, eventScheduler), operation)
        case "parallel":
            return (input) => {
                const sharedInput = input.pipe(deepShareReplay({ refCount: true, bufferSize: 1 }))
                return mergeMatrices(
                    step.steps.map((stepOfSteps, i) =>
                        sharedInput.pipe(
                            map((changes) =>
                                changes.map((change) => ({
                                    index: change.index,
                                    value: change.value.pipe(
                                        map((val) =>
                                            val != null
                                                ? {
                                                      ...val,
                                                      value: clone(val.value, i),
                                                  }
                                                : undefined
                                        )
                                    ),
                                }))
                            ),
                            interpreteStep(stepOfSteps, grammar, operations, clone, eventScheduler)
                        )
                    )
                )
            }
        case "raw":
            return (input) =>
                input.pipe(
                    map((changes) =>
                        changes.map<MatrixEntry<Observable<InterpretionValue<T>>>>((change) => ({
                            ...change,
                            value: of({
                                eventDepthMap: {},
                                terminated: false,
                                value: step.value,
                            }),
                        }))
                    )
                )
        case "sequential":
            return (input) => {
                let current = input
                let terminated: Array<MatrixEntriesObservable<InterpretionValue<T> | undefined>> = []
                for (const stepOfSteps of step.steps) {
                    const sharedCurrent = current.pipe(
                        deepShareReplay({
                            refCount: true,
                            bufferSize: 1,
                        })
                    )
                    terminated.push(sharedCurrent.pipe(useWhenTerminatedIs(true)))
                    current = sharedCurrent.pipe(
                        useWhenTerminatedIs(false),
                        interpreteStep(stepOfSteps, grammar, operations, clone, eventScheduler)
                    )
                    //TODO: think of ways to reduce the amount of "doubles" through splitting
                }

                return mergeMatrices([current, ...terminated])
            }
        case "this":
            return (input) => input
        case "symbol":
            const rule = grammar[step.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${step.identifier}"`)
            }
            return (input) => defer(() => input.pipe(interpreteStep(rule, grammar, operations, clone, eventScheduler)))
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
