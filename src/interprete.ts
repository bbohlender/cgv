import { filter, map, mergeWith, MonoTypeOperatorFunction, NEVER, Observable, of, shareReplay, throwError } from "rxjs"
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
    values: MatrixEntriesObservable<InterpretionValue<T>>
) => MatrixEntriesObservable<InterpretionValue<T>>

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
                changes.map<MatrixEntry<Observable<InterpretionValue<T>>>>((change) => ({
                    ...change,
                    value: change.value.pipe(map((value) => ({ value, eventDepthMap: {}, terminated: false }))),
                }))
            )
        ),
        rules[0],
        grammar,
        operations,
        clone,
        eventScheduler
    ).pipe(
        map((changes) => changes.map((change) => ({ ...change, value: change.value.pipe(map(({ value }) => value)) })))
    )
}

//TODO: combine clone, with clone from cache

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
                return throwError(() => new Error(`unknown operation "${step.identifier}"`))
            }
            //TODO: async interpretation of parameters (to allow recursion)
            return operation(interpreteStep(input, step.parameters, grammar, operations, clone, eventScheduler))
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
                                        map(({ value, eventDepthMap, terminated }) => ({
                                            eventDepthMap,
                                            terminated,
                                            value: clone(value, i),
                                        }))
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
            let result: MatrixEntriesObservable<InterpretionValue<T>> = NEVER
            for (const stepOfSteps of step.steps) {
                const stepResult = interpreteStep(
                    current,
                    stepOfSteps,
                    grammar,
                    operations,
                    clone,
                    eventScheduler
                ).pipe(
                    shareReplay({
                        refCount: true,
                        //TODO: need an alternative to shareReplay since currently we buffer everything (bad) but bufferSize: 1 is also not working
                        //bufferSize: 1,
                    })
                )
                current = stepResult.pipe(filterTerminated(false))
                result = stepResult.pipe(filterTerminated(true), mergeWith(result))
            }
            return current.pipe(mergeWith(result))
        case "this":
            return input
        case "symbol":
            const rule = grammar[step.identifier]
            if (rule == null) {
                return throwError(() => new Error(`unknown rule "${step.identifier}"`))
            }
            return interpreteStep(input, rule, grammar, operations, clone, eventScheduler)
    }
}

function filterTerminated<T>(
    terminated: boolean
): MonoTypeOperatorFunction<Array<MatrixEntry<Observable<InterpretionValue<T>>>>> {
    return map((changes) =>
        changes.map((change) => ({
            index: change.index,
            value: change.value.pipe(filter(({ terminated: t }) => t === terminated)),
        }))
    )
}
