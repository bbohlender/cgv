import {
    getAtPath,
    HierarchicalPath,
    setAtPath,
    ParsedGrammarDefinition,
    Operations,
    HierarchicalParsedGrammarDefinition,
} from ".."
import { translateSelections, getDefaultChildAtIndex, replace, Selections } from "."
import produce, { Draft } from "immer"
import { flatten, HierarchicalInfo, HierarchicalParsedSteps } from "../util"
import {
    AbstractParsedBinaryOperator,
    AbstractParsedIf,
    AbstractParsedOperation,
    AbstractParsedParallel,
    AbstractParsedRandom,
    AbstractParsedSequantial,
    AbstractParsedSetVariable,
    AbstractParsedSwitch,
    AbstractParsedUnaryOperator,
} from "../parser"

export function remove<T, A>(
    selections: Selections,
    operations: Operations<T, A>,
    grammar: HierarchicalParsedGrammarDefinition
): { grammar: HierarchicalParsedGrammarDefinition; selections: Selections } {
    const replaces = translateSelections(
        selections,
        () => getDefau,
        (path) => getAtPath(grammar, path)
    )
    const result = produce(grammar, (draft) => {
        for (const { path, steps } of replaces) {
            setAtPath(draft, path, steps)
            //TODO: remove neutral parents
        }
    })
    return {
        grammar: result,
        selections: [],
    }
}

function getNeutralChild<S extends HierarchicalParsedSteps & { children: Array<HierarchicalParsedSteps> }>(
    parent: S,
    childIndex: number
): HierarchicalParsedSteps {

}

function replaceNeutralParent<S extends HierarchicalParsedSteps & { children: Array<HierarchicalParsedSteps> }>(
    parent: S
): HierarchicalParsedSteps | undefined {

}

function deleteChildReplaceBinaryOperation(
    parent: AbstractParsedBinaryOperator<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    return parent.children[(childIndex + 1) % 2]
}

function deleteChildReplaceUnaryOperator(
    parent: AbstractParsedUnaryOperator<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    ;[
        () => ({
            type: "raw",
            value: true,
        }),
    ]
}

function deleteChildReplaceIf(parent: AbstractParsedIf<HierarchicalInfo>, childIndex: number): HierarchicalParsedSteps {
    ;[
        () => ({
            type: "raw",
            value: true,
        }),
        () => ({
            type: "this",
        }),
        () => ({
            type: "this",
        }),
    ]
}

function deleteChildReplaceOperation(
    parent: AbstractParsedOperation<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    return parent.children[(childIndex + 1) % 2]
}

function deleteChildReplaceParallel(
    parent: AbstractParsedParallel<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    return parent.children[(childIndex + 1) % 2]
}

function deleteChildReplaceSequential(
    parent: AbstractParsedSequantial<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    return parent.children[(childIndex + 1) % 2]
}

function deleteChildReplaceRandom(
    parent: AbstractParsedRandom<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    return parent.children[(childIndex + 1) % 2]
}

function deleteChildReplaceSetVariable(
    parent: AbstractParsedSetVariable<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    ;[
        () => ({
            type: "raw",
            value: 1,
        }),
    ]
}
function deleteChildReplaceSwitch(
    parent: AbstractParsedSwitch<HierarchicalInfo>,
    childIndex: number
): HierarchicalParsedSteps {
    if (index === 0) {
        return {
            type: "raw",
            value: 0,
        }
    }
    return {
        type: "null",
    }
}

function deleteChildReplaceParent<S extends HierarchicalParsedSteps & { children: Array<HierarchicalParsedSteps> }>(
    parent: S,
    childIndex: number
): HierarchicalParsedSteps {
    switch (parent.type) {
        case "add":
        case "multiply":
        case "subtract":
        case "divide":
        case "modulo":
        case "equal":
        case "unequal":
        case "greater":
        case "greaterEqual":
        case "smaller":
        case "smallerEqual":
        case "and":
        case "or":
            return deleteChildReplaceBinaryOperation(parent, childIndex)
        case "not":
        case "invert":
            return deleteChildReplaceUnaryOperator(parent, childIndex)
        case "if":
            return deleteChildReplaceIf(parent, childIndex)
        case "operation":
            return deleteChildReplaceOperation(parent, childIndex)
        case "parallel":
            return deleteChildReplaceParallel(parent, childIndex)
        case "random":
            return deleteChildReplaceRandom(parent, childIndex)
        case "sequential":
            return deleteChildReplaceSequential(parent, childIndex)
        case "setVariable":
            return deleteChildReplaceSetVariable(parent, childIndex)
        case "switch":
            return deleteChildReplaceSwitch(parent, childIndex)
    }
}
