import {
    defer,
    distinctUntilChanged,
    filter,
    map,
    mergeWith,
    MonoTypeOperatorFunction,
    NEVER,
    Observable,
    of,
    shareReplay,
    tap,
} from "rxjs"
import {
    MatrixEntry,
    MatrixEntriesObservable,
    mergeMatrices,
    ParsedEventDefintion,
    ParsedGrammarDefinition,
    ParsedStep,
    generateEventScheduler,
} from "."

export type EventDepthMap = { [identifier in string]?: number }

export type Operation<T> = (
    values: MatrixEntriesObservable<InterpretionValue<T> | undefined>
) => MatrixEntriesObservable<InterpretionValue<T> | undefined>

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
    return interpreteStep(
        input.pipe(
            map((changes) =>
                changes.map<MatrixEntry<Observable<InterpretionValue<T> | undefined>>>((change) => ({
                    ...change,
                    value: change.value.pipe(
                        map((value) => (value != null ? { value, eventDepthMap: {}, terminated: false } : undefined))
                    ),
                }))
            )
        ),
        rules[0],
        grammar,
        operations,
        clone,
        eventScheduler
    ).pipe(
        map((changes) => changes.map((change) => ({ ...change, value: change.value.pipe(map((val) => val?.value)) })))
    )
}

//TODO: combine clone, with clone from cache

//TODO: every time we use shareReplay (we only share the ouside observable but not the inside!!! => either prevent resubscribing to the inner observable or use another async data structure?)

export function interpreteStep<T>(
    input: MatrixEntriesObservable<InterpretionValue<T>>,
    step: ParsedStep,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T,
    eventScheduler: (
        identifier: string,
        event: ParsedEventDefintion,
        input: MatrixEntriesObservable<InterpretionValue<T>>
    ) => MatrixEntriesObservable<InterpretionValue<T>>
): MatrixEntriesObservable<InterpretionValue<T>> {
    switch (step.type) {
        case "operation":
            const operation = operations[step.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${step.identifier}"`)
            }
            return operation(
                defer(() => interpreteStep(input, step.parameters, grammar, operations, clone, eventScheduler))
            )
        case "parallel":
            const sharedInput = input.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
            return mergeMatrices(
                step.steps.map((stepOfSteps, i) =>
                    interpreteStep(
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
                            )
                        ),
                        stepOfSteps,
                        grammar,
                        operations,
                        clone,
                        eventScheduler
                    )
                )
            )

        case "raw":
            return input.pipe(
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
            let current = input
            let terminated: Array<MatrixEntriesObservable<InterpretionValue<T> | undefined>> = []
            for (const stepOfSteps of step.steps) {
                const sharedCurrent = current.pipe(
                    shareReplay({
                        refCount: true,
                        //TODO: need an alternative to shareReplay since currently we buffer everything (bad) but bufferSize: 1 is also not working
                        //bufferSize: 0,
                    })
                )
                terminated.push(sharedCurrent.pipe(useWhenTerminatedIs(true)))
                current = interpreteStep(
                    sharedCurrent.pipe(useWhenTerminatedIs(false)),
                    stepOfSteps,
                    grammar,
                    operations,
                    clone,
                    eventScheduler
                )
                //TODO: think of ways to reduce the amount of "doubles" through splitting
            }

            return mergeMatrices([current, ...terminated])
        case "this":
            return input
        case "symbol":
            const rule = grammar[step.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${step.identifier}"`)
            }
            return interpreteStep(input, rule, grammar, operations, clone, eventScheduler)
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
