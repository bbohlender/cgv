import { Vertical } from "."
import {
    ParsedIf,
    ParsedParallel,
    ParsedRandom,
    ParsedSequantial,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
} from "../parser"
import { Row } from "./group"

export type LinearizedStep =
    | (ParsedSteps & {
          type: Exclude<ParsedSteps["type"], "random" | "if" | "sequential" | "parallel" | "switch" | "symbol">
      })
    | { type: "filter"; condition: ParsedSteps; values: Array<any> }

export type LinearizedRow = Row<LinearizedStep>

export type LinearizationResult = {
    vertical: Vertical<LinearizedRow>
    seperationMatrix: Array<Array<boolean>>
}

export function linearize(step: ParsedSteps, probability: number): LinearizationResult {
    switch (step.type) {
        case "random":
            return linearizeRandom(step, probability)
        case "if":
            return linearizeIf(step, probability)
        case "sequential":
            return linearizeSequential(step, probability)
        case "parallel":
            return linearizeParallel(step, probability)
        case "switch":
            return linearizeSwitch(step, probability)
        case "symbol":
            return linearizeSymbol(step, probability)
        default:
            return { seperationMatrix: [[true]], vertical: [{ probability, horizontal: [step] }] }
    }
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

function mapLinearizationResult(
    result: LinearizationResult,
    map: (row: LinearizedRow) => LinearizedRow
): LinearizationResult {
    return {
        seperationMatrix: result.seperationMatrix,
        vertical: result.vertical.map(map),
    }
}

function linearizeRandom(step: ParsedRandom, probability: number): LinearizationResult {
    return step.children
        .map((childStep, i) => linearize(childStep, step.probabilities[i] * probability))
        .reduce((prev, result) => combineLinearizationResult(prev, result, true))
}

function linearizeIf(step: ParsedIf, probability: number): LinearizationResult {
    return combineLinearizationResult(
        mapLinearizationResult(linearize(step.children[1], probability / 2), (nextSteps) => ({
            horizontal: [
                {
                    type: "filter",
                    condition: step.children[0],
                    values: [true],
                },
                ...nextSteps.horizontal,
            ],
            probability: nextSteps.probability,
        })),
        mapLinearizationResult(linearize(step.children[2], probability / 2), (nextSteps) => ({
            horizontal: [
                {
                    type: "filter",
                    condition: step.children[0],
                    values: [false],
                },
                ...nextSteps.horizontal,
            ],
            probability: nextSteps.probability,
        })),
        true
    )
}

function linearizeSequential(step: ParsedSequantial, probability: number): LinearizationResult {
    const { seperationMatrix, vertical } = step.children
        .map((childStep) => linearize(childStep, 1))
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

function linearizeParallel(step: ParsedParallel, probability: number): LinearizationResult {
    return step.children
        .map((childStep) => linearize(childStep, probability))
        .reduce((prev, result) => combineLinearizationResult(prev, result, false))
}

function linearizeSwitch(step: ParsedSwitch, probability: number): LinearizationResult {
    const p = probability / (step.children.length - 1)
    return step.children
        .slice(1)
        .map((childStep, i) =>
            mapLinearizationResult(linearize(childStep, p), (nextSteps) => ({
                horizontal: [
                    {
                        type: "filter",
                        condition: step.children[0],
                        values: step.cases[i],
                    },
                    ...nextSteps.horizontal,
                ],
                probability: nextSteps.probability,
            }))
        )

        .reduce((prev, result) => combineLinearizationResult(prev, result, true))
}

function linearizeSymbol(step: ParsedSymbol, probability: number): LinearizationResult {
    throw new Error("not implemented")
}
