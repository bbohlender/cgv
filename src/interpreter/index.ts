import { v3 } from "murmurhash"
import {
    delay,
    EMPTY,
    filter,
    groupBy,
    GroupedObservable,
    map,
    merge,
    mergeMap,
    MonoTypeOperatorFunction,
    Observable,
    of,
    OperatorFunction,
    ReplaySubject,
    shareReplay,
    take,
    tap,
    throwError,
} from "rxjs"
import {
    AbstractParsedGrammarDefinition,
    AbstractParsedRandom,
    AbstractParsedSteps,
    ParsedBinaryOperator,
    ParsedGetVariable,
    ParsedGrammarDefinition,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRandom,
    ParsedRaw,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
    ParsedUnaryOperator,
} from "../parser"
import { getNounIndex } from "../util"
import { toList } from "./list"

export type Operation<T> = {
    execute: (parameters: Value<ReadonlyArray<T>>) => Observable<Array<Value<T>>>
    includeThis: boolean
    defaultParameters: Array<() => ParsedSteps>
}

export function simpleExecution<T>(
    execute: (...parameters: ReadonlyArray<T>) => Observable<Array<T>>
): (parameters: Value<ReadonlyArray<T>>) => Observable<Array<Value<T>>> {
    return (parameters) =>
        execute(...parameters.raw).pipe(
            map((results) =>
                results.length === 1
                    ? [
                          {
                              ...parameters,
                              raw: results[0],
                          },
                      ]
                    : results.map((result, i) => ({ ...parameters, raw: result, index: [...parameters.index, i] }))
            )
        )
}

export type Operations<T> = {
    [Name in string]: Operation<T>
}

function anyInvalid(values: Array<Invalid>) {
    for (const entry of values) {
        if (entry.value) {
            return true
        }
    }
    return false
}

export type Invalid = {
    get observable(): Observable<void>
    get value(): boolean
}

export type Invalidator = Invalid & { invalidate: () => void; complete: () => void }

export function createInvalidator(): Invalidator {
    const subject = new ReplaySubject<void>(1)
    const invalid = {
        invalidate: () => {
            invalid.value = true
            subject.next()
        },
        complete: () => subject.complete(),
        observable: subject,
        value: false,
    }
    return invalid
}

export function combineInvalids(...invalids: Array<Invalid>): Invalid {
    return {
        observable: merge(...invalids.map(({ observable }) => observable)).pipe(
            shareReplay({ refCount: true, bufferSize: 1 })
        ),
        value: anyInvalid(invalids),
    }
}

export type Value<T> = {
    raw: T
    invalid: Invalid
    index: Array<number>
    variables: {
        [Name in string]: Observable<any>
    }
    symbolDepth: {
        [Name in string]: number
    }
}

export type InterpreterOptions<T, I> = Readonly<{
    seed?: number
    delay?: number
    maxSymbolDepth?: number
    listeners?: {
        onRandom?: (step: AbstractParsedRandom<I>, value: Value<T>, childStepIndex: number) => void
        onBeforeStep?: (step: AbstractParsedSteps<I>, value: Value<T>) => void
        onAfterStep?: (step: AbstractParsedSteps<I>, value: Value<T>) => void
    }
}>

type InterpretionContext<T, I> = Readonly<
    {
        grammar: ParsedGrammarDefinition
        compiledGrammar: CompiledGrammar<T>
        operations: Operations<T>
        maxSymbolDepth: number
    } & InterpreterOptions<T, I>
>

type CompiledGrammar<T> = { [Name in string]: MonoTypeOperatorFunction<Value<T>> }

export function interprete<T, I>(
    grammar: AbstractParsedGrammarDefinition<I>,
    operations: Operations<T>,
    options: InterpreterOptions<T, I>
): MonoTypeOperatorFunction<Value<T>> {
    if (grammar.length === 0) {
        return (input) => input
    }
    const startSymbolName = grammar[0].name
    const compiledGrammar: CompiledGrammar<T> = {}
    const context: InterpretionContext<T, I> = {
        grammar,
        compiledGrammar,
        operations,
        ...options,
        maxSymbolDepth: options.maxSymbolDepth ?? 100,
    }
    for (const { name, step } of grammar) {
        compiledGrammar[name] = interpreteStep(step, context)
    }
    return compiledGrammar[startSymbolName]
}

const filterInvalid = filter<Value<any>>(({ invalid }) => !invalid.value)

function interpreteStep<T, I>(
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, I>,
    next?: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    try {
        const { delay: time, listeners } = context
        const nextOperations: Array<MonoTypeOperatorFunction<Value<T>>> = [filterInvalid]
        if (listeners?.onAfterStep != null) {
            const onAfterStep = listeners.onAfterStep.bind(null, step)
            nextOperations.push(tap(onAfterStep))
        }
        if (next != null && time != null) {
            nextOperations.push(delay(time))
        }
        if (next != null) {
            nextOperations.push(next)
        }
        const execution = translateStep(step, context, (input) => (input as any).pipe(...nextOperations))
        if (listeners?.onBeforeStep != null) {
            const onBeforeStep = listeners.onBeforeStep.bind(null, step)
            return (input) => input.pipe(tap(onBeforeStep), execution)
        }
        return execution
    } catch (error) {
        return () => throwError(() => error)
    }
}

function translateStep<T, I>(
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    switch (step.type) {
        case "operation":
            return interpreteOperation(step, context, next)
        case "parallel":
            return interpreteParallel(step, context, next)
        case "raw":
            return interpreteRaw(step, next)
        case "sequential":
            return interpreteSequential(step, context, next)
        case "symbol":
            return interpreteSymbol(step, context, next)
        case "this":
            return interpreteThis(next)
        case "invert":
        case "not":
            return interpreteUnaryOperator(step, context, next)
        case "add":
        case "and":
        case "divide":
        case "equal":
        case "greater":
        case "greaterEqual":
        case "modulo":
        case "multiply":
        case "or":
        case "smaller":
        case "smallerEqual":
        case "subtract":
        case "unequal":
            return interpreteBinaryOperator(step, context, next)
        case "if":
            return interpreteIf(step, context, next)
        case "switch":
            return interpreteSwitch(step, context, next)
        case "getVariable":
            return interpreteGetVariable(step, next)
        case "setVariable":
            return interpreteSetVariable(step, context, next)
        case "return":
            return interpreteReturn()
        case "random":
            return interpreteRandom(step, context, next)
        case "null":
            return interpreteNull()
    }
}

function interpreteOperation<T, I>(
    step: ParsedOperation,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const parameters = step.children
    const operation = context.operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    const parameterOperatorFunctions = parameters.map((parameter) => interpreteStep(parameter, context))
    if (operation.includeThis) {
        parameterOperatorFunctions.unshift(noop())
    }
    return (values) =>
        values.pipe(
            operatorsToArray(...parameterOperatorFunctions),
            mergeMap(
                (value) =>
                    operation
                        .execute(value)
                        .pipe(mergeMap((results) => merge(...results.map((result) => of(result).pipe(next))))) //TODO: simplifiable?
            )
        )
}

function interpreteRaw<T>(
    step: ParsedRaw,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            map((value) => ({
                ...value,
                raw: step.value,
            })),
            next
        )
}

const unaryOperations: { [Name in ParsedUnaryOperator["type"]]: (value: any) => any } = {
    invert: (value) => -value,
    not: (value) => !value,
}

function interpreteUnaryOperator<T, I>(
    step: ParsedUnaryOperator,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context)
    return (input) =>
        input.pipe(
            valueOperatorFunction,
            map((value) => ({ ...value, raw: unaryOperations[step.type](value.raw) })),
            next
        )
}

const binaryOperations: { [Name in ParsedBinaryOperator["type"]]: (v1: any, v2: any) => any } = {
    add: (v1, v2) => v1 + v2,
    and: (v1, v2) => v1 && v2,
    divide: (v1, v2) => v1 / v2,
    equal: (v1, v2) => v1 == v2,
    greater: (v1, v2) => v1 > v2,
    greaterEqual: (v1, v2) => v1 >= v2,
    modulo: (v1, v2) => v1 % v2,
    multiply: (v1, v2) => v1 * v2,
    or: (v1, v2) => v1 || v2,
    smaller: (v1, v2) => v1 < v2,
    smallerEqual: (v1, v2) => v1 <= v2,
    subtract: (v1, v2) => v1 - v2,
    unequal: (v1, v2) => v1 != v2,
}

function interpreteBinaryOperator<T, I>(
    step: ParsedBinaryOperator,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valuesOperatorFunction = step.children.map((child) => interpreteStep(child, context))
    return (input) =>
        input.pipe(
            operatorsToArray(...valuesOperatorFunction),
            map((value) => ({
                ...value,
                raw: binaryOperations[step.type](value.raw[0], value.raw[1]),
            })),
            next
        )
}

function interpreteIf<T, I>(
    step: ParsedIf,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const conditionOperatorFunction = interpreteStep(step.children[0], context)
    const [ifOperatorFunction, elseOperatorFunction] = step.children
        .slice(1)
        .map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), conditionOperatorFunction),
            groupBy(({ raw: [, conditionValue] }) => conditionValue),
            mergeMap((value) =>
                value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    value.key ? ifOperatorFunction : elseOperatorFunction
                )
            )
        )
}

function interpreteSwitch<T, I>(
    step: ParsedSwitch,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context)
    const casesOperatorFunctions = step.children.slice(1).map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), valueOperatorFunction),
            groupBy(({ raw: [, switchValue] }) => switchValue),
            mergeMap((value) => {
                const i = step.cases.findIndex((caseValues) => caseValues.includes(value.key))
                if (i === -1) {
                    return EMPTY
                }
                return value.pipe(
                    map((value) => ({
                        ...value,
                        raw: value.raw[0],
                    })),
                    casesOperatorFunctions[i]
                )
            })
        )
}

function interpreteGetVariable<T>(
    step: ParsedGetVariable,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return mergeMap((value) =>
        (value.variables[step.identifier] ?? of(undefined)).pipe(
            toValue(value.invalid, value.index, value.variables),
            next
        )
    )
}

export function toValue<T>(
    invalid?: Invalid,
    index?: Array<number>,
    variables?: Value<T>["variables"]
): OperatorFunction<T, Value<T>> {
    return (input) => {
        let prevInvalid: Invalidator | undefined
        return input.pipe(
            map((raw) => {
                if (prevInvalid != null) {
                    prevInvalid.invalidate()
                }
                prevInvalid = createInvalidator()
                return {
                    raw,
                    index: index ?? [],
                    invalid: invalid == null ? prevInvalid : combineInvalids(prevInvalid, invalid),
                    variables: variables ?? {},
                    symbolDepth: {},
                }
            }),
            tap({
                complete: () => prevInvalid?.complete(),
            })
        )
    }
}

function interpreteReturn<T, A>(): MonoTypeOperatorFunction<Value<T>> {
    return noop()
}

function interpreteNull<T, A>(): MonoTypeOperatorFunction<Value<T>> {
    return () => EMPTY
}

function interpreteSetVariable<T, I>(
    step: ParsedSetVariable,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context)
    return (input) => {
        const shared = input.pipe(
            shareReplay({
                refCount: true,
            }) //TODO: buffer size unlimited???
        )
        const variable = shared.pipe(valueOperatorFunction)
        return shared.pipe(
            map((value) => ({
                ...value,
                variables: {
                    ...value.variables,
                    [step.identifier]: variable,
                },
            })),
            next
        )
    }
}

function interpreteThis<T, A>(next: MonoTypeOperatorFunction<Value<T>>): MonoTypeOperatorFunction<Value<T>> {
    return next
}

const _32bit_max_int = Math.pow(2, 32)

function interpreteRandom<T, A, I>(
    step: AbstractParsedRandom<I>,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    const options = step.children.map((child) => interpreteStep(child, context, next))

    let pipeToOut: OperatorFunction<GroupedObservable<number, Value<T>>, Value<T>>
    if (context.listeners?.onRandom != null) {
        const onRandom = context.listeners.onRandom
        pipeToOut = mergeMap((group) =>
            group.pipe(tap({ next: (value) => onRandom(step, value, group.key) }), options[group.key])
        )
    } else {
        pipeToOut = mergeMap((value) => value.pipe(options[value.key]))
    }

    return (input) =>
        input.pipe(
            groupBy((value) => {
                const rand = v3(value.index.join(","), context.seed) / _32bit_max_int
                let sum = 0
                for (let i = 0; i < step.probabilities.length; i++) {
                    sum += step.probabilities[i]
                    if (rand <= sum) {
                        return i
                    }
                }
                return step.probabilities.length - 1
            }),
            pipeToOut
        )
}

function interpreteParallel<T, I>(
    step: ParsedParallel,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        return merge(
            ...step.children.map((childStep, i) =>
                shared.pipe(
                    map((value) => ({ ...value, index: [...value.index, i] })),
                    interpreteStep(childStep, context, next)
                )
            )
        )
    }
}

function interpreteSequential<T, I>(
    step: ParsedSequantial,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return sequentialNext(0, step.children, context, next)
}

function sequentialNext<T, I>(
    i: number,
    stepsList: Array<ParsedSteps>,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    return i >= stepsList.length
        ? next
        : interpreteStep(stepsList[i], context, sequentialNext(i + 1, stepsList, context, next))
}

function interpreteSymbol<T, I>(
    step: ParsedSymbol,
    context: InterpretionContext<T, I>,
    next: MonoTypeOperatorFunction<Value<T>>
): MonoTypeOperatorFunction<Value<T>> {
    if (getNounIndex(step.identifier, context.grammar) == null) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true, bufferSize: 1 }))
        return shared.pipe(
            take(1),
            mergeMap(() =>
                shared.pipe(
                    map((value) => {
                        const depth = value.symbolDepth[step.identifier] ?? 0
                        if (depth >= context.maxSymbolDepth) {
                            throw new Error(
                                `maximum symbol depth (${context.maxSymbolDepth}) reached for symbol "${step.identifier}"`
                            )
                        }
                        return {
                            ...value,
                            symbolDepth: {
                                ...value.symbolDepth,
                                [step.identifier]: depth + 1,
                            },
                        }
                    }),
                    context.compiledGrammar[step.identifier],
                    next
                )
            )
        )
    }
}

function noop<T>(): MonoTypeOperatorFunction<T> {
    return (input) => input
}

/**
 * only emits when all results are present
 */
function operatorsToArray<T>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T>>>
): OperatorFunction<Value<T>, Value<ReadonlyArray<T>>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        const functions: Array<MonoTypeOperatorFunction<Value<T>>> = [noop(), ...operatorFunctions]
        return merge(
            ...functions.map((func, i) =>
                shared.pipe(
                    func,
                    map((value) => ({ ...value, index: [...value.index, i] }))
                )
            )
        ).pipe(
            groupBy((value) => value.index.slice(0, -1).join(",")),
            mergeMap((value) =>
                value.pipe(
                    toArray(),
                    filter((value) => value.length === operatorFunctions.length + 1),
                    map((results) => {
                        const [input, ...outputs] = results
                        return {
                            variables: input.variables,
                            index: input.index.slice(0, -1),
                            invalid: combineInvalids(...results.map(({ invalid }) => invalid)),
                            raw: outputs.map(({ raw }) => raw),
                            symbolDepth: input.symbolDepth,
                        }
                    })
                )
            )
        )
    }
}

export function toArray<T>(): OperatorFunction<Value<T>, ReadonlyArray<Value<T>>> {
    return toList<T, Array<Value<T>>>(
        () => [],
        (array) => [...array],
        (list, item, index) => list.splice(index, 0, item),
        (list, index) => list.splice(index, 1)
    )
}

export * from "./matrix"
export * from "./list"
