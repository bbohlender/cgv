import { map, Observable, of, shareReplay, tap } from "rxjs"
import {
    MatrixEntry,
    MatrixEntriesObservable,
    mergeMatrices,
    ParsedEventDefintion,
    ParsedGrammarDefinition,
    ParsedStep,
    toArray,
    toChanges,
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
    //terminatec: boolean
    //TODO: parameters (scoped variables accessible through this.type)
}

export function interprete<T>(
    input: Observable<Array<T>>,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>,
    clone: (value: T, index: number) => T,
    debounceTime: number = 100
): Observable<Array<T>> {
    const rules = Object.values(grammar.rules)
    if (rules.length === 0) {
        return input
    }
    const eventScheduler = generateEventScheduler<T>()
    return toArray(
        interpreteStep(
            toChanges(
                input.pipe(map((inputs) => inputs.map<InterpretionValue<T>>((value) => ({ value, eventDepthMap: {} }))))
            ),
            rules[0],
            grammar,
            operations,
            clone,
            eventScheduler
        ),
        debounceTime
    ).pipe(map((interpretionResults) => interpretionResults.map(({ value }) => value)))
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
        case "event":
            const event = grammar.events[step.identifier]
            if (event == null) {
                throw new Error(`unknown event "${step.identifier}"`)
            }
            return eventScheduler(step.identifier, event, input)
        case "operation":
            const operation = operations[step.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${step.identifier}"`)
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
                                        map(({ value, eventDepthMap }) => ({
                                            eventDepthMap,
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
                            value: step.value,
                        }),
                    }))
                )
            )
        case "sequential":
            let current = input
            for (const stepOfSteps of step.steps) {
                current = interpreteStep(current, stepOfSteps, grammar, operations, clone, eventScheduler)
            }
            return current
        case "this":
            return input
        case "symbol":
            const rule = grammar.rules[step.identifier]
            if (rule == null) {
                throw new Error(`unknown rule "${step.identifier}"`)
            }
            return interpreteStep(input, rule, grammar, operations, clone, eventScheduler)
    }
}
