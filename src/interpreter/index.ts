import {
    filter,
    ignoreElements,
    map,
    mapTo,
    merge,
    mergeMap,
    MonoTypeOperatorFunction,
    Observable,
    OperatorFunction,
    scan,
    shareReplay,
    Subject,
} from "rxjs"
import {
    ParsedBinaryOperator,
    ParsedBracket,
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

export type Operation<T> = {
    execute: (...parameters: Array<T>) => Observable<T>
}

export type Operations<T> = {
    [Name in string]: Operation<T>
}

export type Value<T> = {
    raw: T
    invalid: Observable<any>
    index: Array<number>
}

export function interprete<T>(grammar: ParsedGrammarDefinition): MonoTypeOperatorFunction<Value<T>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return (input) => input
    }
    return interpreteStep<T>(rules[0], grammar)
}

function interpreteStep<T>(step: ParsedSteps, grammar: ParsedGrammarDefinition): MonoTypeOperatorFunction<Value<T>> {
    switch (step.type) {
        case "operation":
            return interpreteOperation(step, grammar)
        case "parallel":
            return interpreteParallel(step, grammar)
        case "raw":
            return interpreteRaw(step)
        case "sequential":
            return interpreteSequential(step, grammar)
        case "symbol":
            return interpreteSymbol(step, grammar)
        case "this":
            return interpreteThis()
        case "bracket":
            return interpreteBracket(step, grammar)
        case "invert":
        case "not":
            return interpreteUnaryOperator(step, grammar)
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
            return interpreteBinaryOperator(step, grammar)
        case "if":
            return interpreteIf(step, grammar)
        case "switch":
            return interpreteSwitch(step, grammar)
        case "getVariable":
            return interpreteGetVariable(step, grammar)
        case "setVariable":
            return interpreteSetVariable(step, grammar)
        case "return":
            return interpreteReturn()
        case "random":
            return interpreteRandom(step, grammar)
    }
}

function interpreteOperation<T>(
    step: ParsedOperation,
    grammar: ParsedGrammarDefinition,
    operations: Operations<T>
): MonoTypeOperatorFunction<Value<T>> {
    const parameters = step.children
    const operation = operations[step.identifier]
    if (operation == null) {
        throw new Error(`unknown operation "${step.identifier}"`)
    }
    return (values) =>
        values.pipe(
            operatorsToArray(...parameters.map((parameter) => interpreteStep<T>(parameter, grammar))),
            mergeMap((value) =>
                operation.execute(...value.raw).pipe(
                    map((raw) => ({
                        raw,
                        index: value.index,
                        invalid: value.invalid,
                    }))
                )
            )
        )
}

function interpreteRaw<T>(step: ParsedRaw): MonoTypeOperatorFunction<Value<T>> {
    return map(({ index, invalid }) => ({
        index,
        invalid,
        raw: step.value,
    }))
}

function interpreteBracket<T>(
    step: ParsedBracket,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {
    return interpreteStep(step, grammar)
}

const unaryOperations: { [Name in ParsedUnaryOperator["type"]]: (value: any) => any } = {
    invert: (value) => -value,
    not: (value) => !value,
}

function interpreteUnaryOperator<T>(
    step: ParsedUnaryOperator,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            interpreteStep(step.children[0], grammar),
            map((value) => ({ ...value, raw: unaryOperations[step.type](value.raw) }))
        )
}

const binaryOperations: { [Name in ParsedBinaryOperator["type"]]: (v1: any, v2: any) => any } = {
    add: (v1, v2) => v1 + v2,
    and: (v1, v2) => v1 + v2,
    divide: (v1, v2) => v1 + v2,
    equal: (v1, v2) => v1 + v2,
    greater: (v1, v2) => v1 + v2,
    greaterEqual: (v1, v2) => v1 + v2,
    modulo: (v1, v2) => v1 + v2,
    multiply: (v1, v2) => v1 + v2,
    or: (v1, v2) => v1 + v2,
    smaller: (v1, v2) => v1 + v2,
    smallerEqual: (v1, v2) => v1 + v2,
    subtract: (v1, v2) => v1 + v2,
    unequal: (v1, v2) => v1 + v2,
}

function interpreteBinaryOperator<T>(
    step: ParsedBinaryOperator,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        input.pipe(
            operatorsToArray(...step.children.map((child) => interpreteStep(child, grammar))),
            map((value) => ({
                ...value,
                raw: binaryOperations[step.type](value.raw[0], value.raw[1]),
            }))
        )
}

function interpreteIf<T>(step: ParsedIf, grammar: ParsedGrammarDefinition): MonoTypeOperatorFunction<Value<T>> {}

function interpreteSwitch<T>(
    step: ParsedSwitch,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteGetVariable<T>(
    step: ParsedGetVariable,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteReturn<T>(): MonoTypeOperatorFunction<Value<T>> {
    //TODO: premature terminaton
}

function interpreteSetVariable<T>(
    step: ParsedSetVariable,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteThis<T>(): MonoTypeOperatorFunction<Value<T>> {}

function interpreteRandom<T>(
    step: ParsedRandom,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteParallel<T>(
    step: ParsedParallel,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {
    return parallel(...step.children.map((childStep) => interpreteStep<T>(childStep, grammar)))
}

function interpreteSequential<T>(
    step: ParsedSequantial,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {
    return (input) =>
        step.children.reduce((input, childStep) => input.pipe(interpreteStep<T>(childStep, grammar)), input)
}

function interpreteSymbol<T>(step: ParsedSymbol, grammar: ParsedGrammarDefinition): MonoTypeOperatorFunction<Value<T>> {
    const symbolStep = grammar[step.identifier]
    if (symbolStep == null) {
        throw new Error(`unknown symbol "${step.identifier}"`)
    }
    return interpreteStep(symbolStep, grammar)
}

function parallel<T>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T>>>
): MonoTypeOperatorFunction<Value<T>> {
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        return merge(
            ...operatorFunctions.map((func, i) =>
                shared.pipe(
                    map((value) => ({ ...value, index: [...value.index, i] })),
                    func
                )
            )
        )
    }
}

/**
 * only emits when all results are present
 */
function operatorsToArray<T>(
    ...operatorFunctions: Array<MonoTypeOperatorFunction<Value<T>>>
): OperatorFunction<Value<T>, Value<ReadonlyArray<T>>> {
    return (input) =>
        input.pipe(
            parallel(...operatorFunctions),
            toArray(),
            filter((value) => value.raw.length != operatorFunctions.length)
        )
}

export function toValue<T>(): OperatorFunction<T, Value<T>> {
    return scan<T, { raw: T; invalid: Subject<void>; index: Array<number> }, undefined>((prev, raw) => {
        if (prev != null) {
            prev.invalid.next()
        }
        return {
            raw,
            invalid: new Subject<void>(),
            index: [],
        }
    }, undefined)
}

//TODO: option to use only the last layer of index
export function toArray<T>(): OperatorFunction<Value<T>, Value<ReadonlyArray<T>>> {
    return toList<T, Array<T>>(
        () => [],
        (array) => [...array],
        (list, item, index) => list.splice(index, 0, item),
        (list, index) => list.splice(index, 1)
    )
}

export * from "./matrix"
export * from "./list"
