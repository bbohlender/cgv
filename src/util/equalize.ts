import { ParsedSteps, serializeStepString } from ".."

/**
 * compares all steps from the provides grammars and removes duplicate so semantically equal steps are referring the exact same `ParsedStep` object
 * the references are also equal in the grammar itself (e.g. if one grammar uses the raw value "1" multiple times, it will reference the same ParsedValue object)
 */
export function equalizeSteps(stepsList: Array<ParsedSteps>): Array<ParsedSteps> {
    const map = new Map<string, ParsedSteps>()
    return stepsList.map((steps) =>
        traverseAndReplace(steps, (element) => {
            const key = serializeStepString(element)
            const entry = map.get(key)
            if (entry != null) {
                return entry
            }
            map.set(key, element)
            return element
        })
    )
}

export function isEqual(steps1: ParsedSteps, steps2: ParsedSteps): boolean {
    return serializeStepString(steps1) === serializeStepString(steps2)
}

function traverseAndReplace(element: ParsedSteps, fn: (element: ParsedSteps) => ParsedSteps): ParsedSteps {
    if (element.children != null) {
        for (let i = 0; i < element.children.length; i++) {
            element.children[i] = traverseAndReplace(element.children[i], fn)
        }
    }
    return fn(element)
}
