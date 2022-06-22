import { Vertical } from "."
import {
    ParsedBinaryOperator,
    ParsedGetVariable,
    ParsedIf,
    ParsedNull,
    ParsedOperation,
    ParsedParallel,
    ParsedRandom,
    ParsedRaw,
    ParsedReturn,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
    ParsedThis,
    ParsedUnaryOperator,
} from "../parser"
import { Row } from "./group"

export type LinearizedStep =
    | (Omit<ParsedOperation | ParsedSetVariable, "children"> & {
          children: Array<LinearizationResult>
      })
    | (Omit<ParsedBinaryOperator | ParsedUnaryOperator, "children"> & {
          children: Array<LinearizationResult>
      })
    | ParsedRaw
    | ParsedThis
    | ParsedGetVariable
    | ParsedReturn
    | ParsedNull
    | { type: "filterStart"; condition: LinearizationResult; values: Array<any>; options: number }
    | { type: "filterEnd" }
    | { type: "nounStart"; identifier: string }
    | { type: "nounEnd" }

export type LinearizedRow = Row<LinearizedStep>

export type LinearizationResult = {
    vertical: Vertical<LinearizedRow>
    seperationMatrix: Array<Array<boolean>>
}

export function linearize(
    step: ParsedSteps,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    switch (step.type) {
        case "random":
            return linearizeRandom(step, resolveNoun, probability)
        case "if":
            return linearizeIf(step, resolveNoun, probability)
        case "sequential":
            return linearizeSequential(step, resolveNoun, probability)
        case "parallel":
            return linearizeParallel(step, resolveNoun, probability)
        case "switch":
            return linearizeSwitch(step, resolveNoun, probability)
        case "symbol":
            return linearizeNounRef(step, resolveNoun, probability)
        default:
            return {
                seperationMatrix: [[true]],
                vertical: [
                    {
                        probability,
                        horizontal: [linearizeStepWithChildren(step, resolveNoun)],
                    },
                ],
            }
    }
}

function linearizeStepWithChildren(
    step:
        | ParsedOperation
        | ParsedBinaryOperator
        | ParsedUnaryOperator
        | ParsedSetVariable
        | ParsedRaw
        | ParsedThis
        | ParsedGetVariable
        | ParsedReturn
        | ParsedNull,
    resolveNoun: (identifier: string) => ParsedSteps
): LinearizedStep {
    if (step.children != null) {
        return {
            ...step,
            children: step.children.map((child) => linearize(child, resolveNoun, 1)),
        }
    }
    return step
}

export function combineLinearizationResult(
    l1: LinearizationResult,
    l2: LinearizationResult,
    seperated: boolean
): LinearizationResult {
    const l1Suffixed = l1.seperationMatrix.map((row) => row.concat(new Array(l2.vertical.length).fill(seperated)))
    const prefixedL2 = l2.seperationMatrix.map((row) => new Array(l1.vertical.length).fill(seperated).concat(row))
    return {
        vertical: l1.vertical.concat(l2.vertical),
        seperationMatrix: l1Suffixed.concat(prefixedL2),
    }
}

export function mapLinearizationResult(
    result: LinearizationResult,
    map: (row: LinearizedRow) => LinearizedRow
): LinearizationResult {
    return {
        seperationMatrix: result.seperationMatrix,
        vertical: result.vertical.map(map),
    }
}

function linearizeRandom(
    step: ParsedRandom,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    return step.children
        .map((childStep, i) => linearize(childStep, resolveNoun, step.probabilities[i] * probability))
        .reduce((prev, result) => combineLinearizationResult(prev, result, true))
}

function linearizeIf(
    step: ParsedIf,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    return combineLinearizationResult(
        mapLinearizationResult(linearize(step.children[1], resolveNoun, probability / 2), (nextSteps) => ({
            horizontal: [
                {
                    type: "filterStart",
                    condition: linearize(step.children[0], resolveNoun, 1),
                    values: [true],
                    options: 2,
                },
                ...nextSteps.horizontal,
                {
                    type: "filterEnd",
                },
            ],
            probability: nextSteps.probability,
        })),
        mapLinearizationResult(linearize(step.children[2], resolveNoun, probability / 2), (nextSteps) => ({
            horizontal: [
                {
                    type: "filterStart",
                    condition: linearize(step.children[0], resolveNoun, 1),
                    values: [false],
                    options: 2,
                },
                ...nextSteps.horizontal,
                {
                    type: "filterEnd",
                },
            ],
            probability: nextSteps.probability,
        })),
        true
    )
}

function linearizeSequential(
    step: ParsedSequantial,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    const { seperationMatrix, vertical } = step.children
        .map((childStep) => linearize(childStep, resolveNoun, 1))
        .reduce((prev, result) => combineSequentialLinearization(prev, result))
    return {
        seperationMatrix,
        vertical: vertical.map(({ horizontal, probability: p }) => ({ horizontal, probability: p * probability })),
    }
}

function combineSequentialLinearization(l1: LinearizationResult, l2: LinearizationResult): LinearizationResult {
    const vertical: Vertical<LinearizedRow> = []
    const seperationMatrix: Array<Array<boolean>> = []
    for (let i1 = 0; i1 < l1.vertical.length; i1++) {
        for (let j1 = 0; j1 < l2.vertical.length; j1++) {
            const vIndex1 = i1 * l2.vertical.length + j1
            vertical[vIndex1] = {
                horizontal: [...l1.vertical[i1].horizontal, ...l2.vertical[j1].horizontal],
                probability: l1.vertical[i1].probability * l2.vertical[j1].probability,
            }
            for (let i2 = 0; i2 < l1.vertical.length; i2++) {
                for (let j2 = 0; j2 < l2.vertical.length; j2++) {
                    const vIndex2 = i2 * l2.vertical.length + j2
                    let row1 = seperationMatrix[vIndex1]
                    let row2 = seperationMatrix[vIndex2]
                    if (row1 == null) {
                        row1 = []
                        seperationMatrix[vIndex1] = row1
                    }
                    if (row2 == null) {
                        row2 = []
                        seperationMatrix[vIndex2] = row2
                    }
                    const value = l1.seperationMatrix[i1][i2] && l2.seperationMatrix[j1][j2]
                    row1[vIndex2] = value
                    row2[vIndex1] = value
                }
            }
        }
    }
    return {
        vertical,
        seperationMatrix,
    }
}

function linearizeParallel(
    step: ParsedParallel,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    return step.children
        .map((childStep) => linearize(childStep, resolveNoun, probability))
        .reduce((prev, result) => combineLinearizationResult(prev, result, false))
}

function linearizeSwitch(
    step: ParsedSwitch,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    const p = probability / (step.children.length - 1)
    const condition = linearize(step.children[0], resolveNoun, 1)
    return step.children
        .slice(1)
        .map((childStep, i) =>
            mapLinearizationResult(linearize(childStep, resolveNoun, p), (nextSteps) => ({
                horizontal: [
                    {
                        type: "filterStart",
                        condition,
                        values: step.cases[i],
                        options: step.children.length - 1,
                    },
                    ...nextSteps.horizontal,
                    {
                        type: "filterEnd",
                    },
                ],
                probability: nextSteps.probability,
            }))
        )

        .reduce((prev, result) => combineLinearizationResult(prev, result, true))
}

function linearizeNounRef(
    step: ParsedSymbol,
    resolveNoun: (identifier: string) => ParsedSteps,
    probability: number
): LinearizationResult {
    return mapLinearizationResult(linearize(resolveNoun(step.identifier), resolveNoun, probability), (nextSteps) => ({
        horizontal: [
            {
                type: "nounStart",
                identifier: step.identifier,
            },
            ...nextSteps.horizontal,
            {
                type: "nounEnd",
            },
        ],
        probability: nextSteps.probability,
    }))
}
