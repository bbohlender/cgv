import {
    delay,
    EMPTY,
    filter,
    groupBy,
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
import { toList } from "./list"

export type Operation<T, A> = {
    execute: (parameters: Value<ReadonlyArray<T>, A>) => Observable<Array<Value<T, A>>>
    includeThis: boolean
    defaultParameters: () => Array<ParsedSteps>
}

export function simpleExecution<T, A>(
    execute: (...parameters: ReadonlyArray<T>) => Observable<Array<T>>
): (parameters: Value<ReadonlyArray<T>, A>) => Observable<Array<Value<T, A>>> {
    return (parameters) =>
        execute(...parameters.raw).pipe(
            map((results) =>
                results.length === 0
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

export type Operations<T, A> = {
    [Name in string]: Operation<T, A>
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

export type Value<T, A> = {
    raw: T
    invalid: Invalid
    index: Array<number>
    variables: {
        [Name in string]: Observable<any>
    }
    symbolDepth: {
        [Name in string]: number
    }
    annotation: A
}

export type InterpreterOptions<T, A, I> = Readonly<{
    delay?: number
    maxSymbolDepth?: number
    annotateBeforeStep?: (value: Value<T, A>, step: AbstractParsedSteps<I>) => A
    annotateAfterStep?: (value: Value<T, A>, step: AbstractParsedSteps<I>) => A
}>

type InterpretionContext<T, A, I> = Readonly<
    {
        grammar: ParsedGrammarDefinition
        compiledGrammar: CompiledGrammar<T, A>
        operations: Operations<T, A>
        maxSymbolDepth: number
    } & InterpreterOptions<T, A, I>
>

type CompiledGrammar<T, A> = { [Name in string]: MonoTypeOperatorFunction<Value<T, A>> }

export function interprete<T, A, I>(
    grammar: AbstractParsedGrammarDefinition<I>,
    operations: Operations<T, A>,
    options: InterpreterOptions<T, A, I>
): MonoTypeOperatorFunction<Value<T, A>> {
    const entries = Object.entries(grammar)
    if (entries.length === 0) {
        return (input) => input
    }
    const [startSymbolName] = entries[0]
    const compiledGrammar: CompiledGrammar<T, A> = {}
    const context: InterpretionContext<T, A, I> = {
        grammar,
        compiledGrammar,
        operations,
        ...options,
        maxSymbolDepth: options.maxSymbolDepth ?? 100,
    }
    for (const [name, steps] of entries) {
        compiledGrammar[name] = interpreteStep(steps, context, noop())
    }
    return compiledGrammar[startSymbolName]
}

const filterInvalid = filter<Value<any, any>>(({ invalid }) => !invalid.value)

function interpreteStep<T, A, I>(
    step: AbstractParsedSteps<I>,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    try {
        const { delay: time, annotateAfterStep, annotateBeforeStep } = context
        const nextOperations: Array<MonoTypeOperatorFunction<Value<T, A>>> = [filterInvalid]
        if (annotateAfterStep != null) {
            nextOperations.push(
                map((value) => ({
                    ...value,
                    annotation: annotateAfterStep(value, step),
                }))
            )
        }
        if (time != null) {
            nextOperations.push(delay(time))
        }
        nextOperations.push(next)
        const execution = translateStep(step, context, (input) => (input as any).pipe(...nextOperations))
        if (annotateBeforeStep != null) {
            return (input) =>
                input.pipe(
                    map((value) => ({
                        ...value,
                        annotation: annotateBeforeStep(value, step),
                    })),
                    execution
                )
        }
        return execution
    } catch (error) {
        return () => throwError(() => error)
    }
}

function translateStep<T, A, I>(
    step: ParsedSteps,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
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

function interpreteOperation<T, A, I>(
    step: ParsedOperation,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const parameters = step.children
    const operation = context.operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    const parameterOperatorFunctions = parameters.map((parameter) => interpreteStep(parameter, context, noop()))
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

function interpreteRaw<T, A>(
    step: ParsedRaw,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
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

function interpreteUnaryOperator<T, A, I>(
    step: ParsedUnaryOperator,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context, noop())
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

function interpreteBinaryOperator<T, A, I>(
    step: ParsedBinaryOperator,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const valuesOperatorFunction = step.children.map((child) => interpreteStep(child, context, noop()))
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

function interpreteIf<T, A, I>(
    step: ParsedIf,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const conditionOperatorFunction = interpreteStep(step.children[0], context, noop())
    const [ifOperatorFunction, elseOperatorFunction] = step.children
        .slice(1)
        .map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), conditionOperatorFunction),
            groupBy(({ raw: [, switchValue] }) => switchValue),
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

function interpreteSwitch<T, A, I>(
    step: ParsedSwitch,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context, noop())
    const casesOperatorFunctions = step.children.slice(1).map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            operatorsToArray(noop(), valueOperatorFunction),
            groupBy(({ raw: [, switchValue] }) => switchValue),
            mergeMap((value) => {
                const i = step.cases.findIndex((caseValue) => caseValue === value.key)
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

function interpreteGetVariable<T, A>(
    step: ParsedGetVariable,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    return mergeMap((value) =>
        (value.variables[step.identifier] ?? of(undefined)).pipe(
            toValue(value.annotation, value.invalid, value.index, value.variables),
            next
        )
    )
}

export function toValue<T>(annotation?: undefined): OperatorFunction<T, Value<T, undefined>>
export function toValue<T, A>(
    annotation: A,
    invalid?: Invalid,
    index?: Array<number>,
    variables?: Value<T, A>["variables"]
): OperatorFunction<T, Value<T, A>>

export function toValue<T, A>(
    annotation: A,
    invalid?: Invalid,
    index?: Array<number>,
    variables?: Value<T, A>["variables"]
): OperatorFunction<T, Value<T, A>> {
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
                    annotation,
                }
            }),
            tap({
                complete: () => prevInvalid?.complete(),
            })
        )
    }
}

function interpreteReturn<T, A>(): MonoTypeOperatorFunction<Value<T, A>> {
    return noop()
}

function interpreteNull<T, A>(): MonoTypeOperatorFunction<Value<T, A>> {
    return () => EMPTY
}

function interpreteSetVariable<T, A, I>(
    step: ParsedSetVariable,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const valueOperatorFunction = interpreteStep(step.children[0], context, noop())
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

function interpreteThis<T, A>(next: MonoTypeOperatorFunction<Value<T, A>>): MonoTypeOperatorFunction<Value<T, A>> {
    return next
}

function interpreteRandom<T, A, I>(
    step: ParsedRandom,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    const options = step.children.map((child) => interpreteStep(child, context, next))
    return (input) =>
        input.pipe(
            groupBy(() => {
                const rand = Math.random()
                let sum = 0
                for (let i = 0; i < step.probabilities.length; i++) {
                    sum += step.probabilities[i]
                    if (rand <= sum) {
                        return i
                    }
                }
                return step.probabilities.length - 1
            }),
            mergeMap((value) => value.pipe(options[value.key]))
        )
}

function interpreteParallel<T, A, I>(
    step: ParsedParallel,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    return parallel(...step.children.map((childStep) => interpreteStep(childStep, context, next)))
}

function interpreteSequential<T, A, I>(
    step: ParsedSequantial,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    return sequentialNext(0, step.children, context, next)
}

function sequentialNext<T, A, I>(
    i: number,
    stepsList: Array<ParsedSteps>,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    return i >= stepsList.length
        ? next
        : interpreteStep(stepsList[i], context, sequentialNext(i + 1, stepsList, context, next))
}

function interpreteSymbol<T, A, I>(
    step: ParsedSymbol,
    context: InterpretionContext<T, A, I>,
    next: MonoTypeOperatorFunction<Value<T, A>>
): MonoTypeOperatorFunction<Value<T, A>> {
    if (!(step.identifier in context.grammar)) {
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

function parallel<T, A>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T, A>>>
): MonoTypeOperatorFunction<Value<T, A>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        return merge(
            ...operatorFunctions.map((func, i) =>
                shared.pipe(
                    func,
                    map((value) => ({ ...value, index: [i, ...value.index] }))
                )
            )
        )
    }
}

/**
 * only emits when all results are present
 */
function operatorsToArray<T, A>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T, A>>>
): OperatorFunction<Value<T, A>, Value<ReadonlyArray<T>, A>> {
    return (input) =>
        input.pipe(
            parallel(noop(), ...operatorFunctions),
            toArray(),
            filter((value) => value.length === operatorFunctions.length + 1),
            outputsToValue()
        )
}

function outputsToValue<T, A>(): OperatorFunction<ReadonlyArray<Value<T, A>>, Value<ReadonlyArray<T>, A>> {
    return map((results) => {
        const [input, ...outputs] = results
        return {
            variables: input.variables,
            index: input.index.slice(1),
            invalid: combineInvalids(...results.map(({ invalid }) => invalid)),
            raw: outputs.map(({ raw }) => raw),
            symbolDepth: input.symbolDepth,
            annotation: input.annotation,
        }
    })
}

export function toArray<T, A>(): OperatorFunction<Value<T, A>, ReadonlyArray<Value<T, A>>> {
    return toList<T, A, Array<Value<T, A>>>(
        () => [],
        (array) => [...array],
        (list, item, index) => list.splice(index, 0, item),
        (list, index) => list.splice(index, 1)
    )
}

export * from "./matrix"
export * from "./list"
