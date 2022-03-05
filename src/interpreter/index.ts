import { merge, MonoTypeOperatorFunction, Observable, shareReplay } from "rxjs"
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

type Value<T> = {
    raw: T
    invalid: Observable<void>
    index: Array<number>
}

export function interprete<T>(grammar: ParsedGrammarDefinition): MonoTypeOperatorFunction<Value<T>> {
    const rules = Object.values(grammar)
    if (rules.length === 0) {
        return (input) => input
    }
    return interpreteStep<T>(rules[0], grammar, operations, ruleOperatorMap)
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
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteRaw<T>(step: ParsedRaw): MonoTypeOperatorFunction<Value<T>> {}

function interpreteBracket<T>(
    step: ParsedBracket,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteUnaryOperator<T>(
    step: ParsedUnaryOperator,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteBinaryOperator<T>(
    step: ParsedBinaryOperator,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteIf<T>(step: ParsedIf, grammar: ParsedGrammarDefinition): MonoTypeOperatorFunction<Value<T>> {}

function interpreteSwitch<T>(
    step: ParsedSwitch,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteGetVariable<T>(
    step: ParsedGetVariable,
    grammar: ParsedGrammarDefinition
): MonoTypeOperatorFunction<Value<T>> {}

function interpreteReturn<T>(): MonoTypeOperatorFunction<Value<T>> {}

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
    return (input) => {
        const shared = input.pipe(shareReplay({ refCount: true })) //TODO: buffer size unlimited???
        return merge(...step.children.map((childStep) => shared.pipe(interpreteStep<T>(childStep, grammar))))
    }
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
