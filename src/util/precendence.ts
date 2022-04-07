import { ParsedSteps } from ".."

/**
 * further up (low precedence) to further down (high precedence)
 */
const operatorPrecedence: Array<Array<ParsedSteps["type"]>> = [
    ["parallel"],
    ["sequential"],
    ["or"],
    ["and"],
    ["not"],
    ["equal", "unequal"],
    ["smaller", "smallerEqual", "greater", "greaterEqual"],
    ["add", "subtract"],
    ["multiply", "divide", "modulo"],
    ["invert"],
    ["getVariable", "setVariable", "if", "switch", "random", "symbol", "operation", "this", "raw", "return", "null"],
]

const bracketFree: Array<ParsedSteps["type"]> = ["if", "switch", "random", "operation"]

const operatorPrecedenceMap: { [Key in ParsedSteps["type"]]: number } = operatorPrecedence.reduce(
    (result, types, i) => {
        types.forEach((type) => (result[type] = i))
        return result
    },
    {} as any
)

export function hasHigherPrecendence(s1: ParsedSteps, s2: ParsedSteps): boolean {
    const s1Precedence = operatorPrecedenceMap[s1.type]
    const s2Precedence = operatorPrecedenceMap[s2.type]
    return s1Precedence > s2Precedence
}

export function requiresBracket(parent: ParsedSteps, child: ParsedSteps): boolean {
    return bracketFree.includes(parent.type) && hasHigherPrecendence(parent, child)
}