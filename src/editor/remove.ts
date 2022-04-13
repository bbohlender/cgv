import {
    HierarchicalInfo,
    HierarchicalParsedSteps,
    TranslatedPath,
    ParsedSteps,
    HierarchicalPath,
    HierarchicalParsedGrammarDefinition,
    Operations,
} from ".."
import { replace, insert, EditorState } from "."
import { SelectionsMap } from "./indices"

function getNeutralStep(
    path: HierarchicalPath,
    translatedPath: TranslatedPath<HierarchicalInfo>,
    operations: Operations<any, any>,
    index: number = translatedPath.length - 2
): ParsedSteps {
    if (index === 0) {
        return {
            type: "this",
        } //we assume "this" is okay (it's probematic f.e.: "a -> 1 + b    b -> 2" to skip step "2" in "b")
    }
    const parent = translatedPath[index] as HierarchicalParsedSteps & { children: Array<ParsedSteps> }
    const childIndex = path[index] as number
    switch (parent.type) {
        case "smaller":
        case "smallerEqual":
        case "greater":
        case "greaterEqual":
        case "add":
        case "subtract":
        case "invert":
        case "unequal":
        case "equal":
            return {
                type: "raw",
                value: 0,
            }
        case "modulo":
        case "multiply":
        case "divide":
            return {
                type: "raw",
                value: 1,
            }
        case "and":
        case "or":
        case "not":
            return {
                type: "raw",
                value: false,
            }
        case "operation": {
            const operation = operations[parent.identifier]
            if (operation == null) {
                throw new Error(`unknown operation "${parent.identifier}"`)
            }
            const defaultParameterGenerator = operation.defaultParameters[childIndex]
            if (defaultParameterGenerator == null) {
                return {
                    type: "null",
                }
            }
            return defaultParameterGenerator()
        }
        case "setVariable":
            return {
                type: "this",
            }
        case "sequential":
            if (childIndex === 0) {
                return getNeutralStep(path, translatedPath, operations, index - 1)
            }
            return { type: "this" }
        case "parallel":
        case "random":
        case "switch":
            return getNeutralStep(path, translatedPath, operations, index - 1)
        case "if":
            if (childIndex === 0) {
                return {
                    type: "raw",
                    value: true,
                }
            }
            return getNeutralStep(path, translatedPath, operations, index - 1)
        default:
            throw new Error(`unexpected parent type "${(parent as any).type}"`)
    }
}

export function removeValue(
    selectionsMap: SelectionsMap,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    const { grammar: result } = insert("after", selectionsMap, () => ({ type: "null" }), grammar)
    return { grammar: result, selectionsMap: {} }
}

export function removeStep(
    selectionsMap: SelectionsMap,
    operations: Operations<any, any>,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    const { grammar: result } = replace(
        selectionsMap,
        (_, path, translatedPath) => getNeutralStep(path, translatedPath, operations),
        grammar
    )
    return { grammar: result, selectionsMap: {} }
}
