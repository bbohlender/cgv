import { ParsedGrammarDefinition, ParsedSteps } from ".."

export function trimGrammar(grammarDefinition: ParsedGrammarDefinition): ParsedGrammarDefinition {
    return Object.entries(grammarDefinition).reduce<ParsedGrammarDefinition>(
        (result, [key, steps]) => ({ ...result, [key]: trimSteps(steps) }),
        {}
    )
}

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
    ["bracket", "getVariable", "setVariable", "if", "switch", "symbol", "operation", "this", "raw", "return"],
]

const operatorPrecedenceMap = new Map<ParsedSteps["type"], number>(
    operatorPrecedence.reduce<Array<[ParsedSteps["type"], number]>>((result, types, i) => {
        types.forEach((type) => result.push([type, i]))
        return result
    }, [])
)

export function trimSteps(steps: ParsedSteps): ParsedSteps {
    const strippedFromBrackets = trimBrackets(steps, undefined)
    return trimNestedMultistep(strippedFromBrackets)
}

export function trimBrackets(steps: ParsedSteps, parent: ParsedSteps | undefined): ParsedSteps {
    if (steps.children != null) {
        for(let i = 0; i < steps.children.length; i++) {
            steps.children[i] = trimBrackets(steps.children[i], steps)
        }
    }
    if (steps.type != "bracket") {
        return steps
    }
    if (parent == null) {
        return steps.children[0]
    }
    return trimBracketsChildParent(steps, steps.children[0], parent.type)
}

function trimBracketsChildParent(
    bracket: ParsedSteps,
    childOfBracket: ParsedSteps,
    parentOfBracketType: ParsedSteps["type"]
): ParsedSteps {
    const childPrecedence = operatorPrecedenceMap.get(childOfBracket.type)!
    const parentPrecedence = operatorPrecedenceMap.get(parentOfBracketType)!
    if (childPrecedence >= parentPrecedence) {
        return childOfBracket
    }
    return bracket
}

function trimNestedMultistep(steps: ParsedSteps): ParsedSteps {
    if (steps.type == "parallel" || steps.type == "sequential") {
        steps.children = steps.children.reduce<Array<ParsedSteps>>((result, nestedSteps) => {
            if (nestedSteps.type === steps.type) {
                return [...result, ...nestedSteps.children]
            }
            return [...result, nestedSteps]
        }, [])
    }

    return steps
}
