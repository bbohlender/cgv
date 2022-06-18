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

export function linearize(step: ParsedSteps, probability: number): Vertical<LinearizedRow> {
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
            return [{ probability, horizontal: [step] }]
    }
}

function combineSeperationMatrix(
    m1: Array<Array<boolean>>,
    m2: Array<Array<boolean>>,
    seperated: boolean
): Array<Array<boolean>> {
    
}

function linearizeRandom(step: ParsedRandom, probability: number): Vertical<LinearizedRow> {
    const p = probability / step.children.length
    return step.children.reduce<Vertical<LinearizedRow>>((prev, childStep) => [...prev, ...linearize(childStep, p)], [])
}

function linearizeIf(step: ParsedIf, probability: number): Vertical<LinearizedRow> {
    return [
        ...linearize(step.children[1], probability / 2).map<LinearizedRow>((nextSteps) => ({
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
        ...linearize(step.children[2], probability / 2).map<LinearizedRow>((nextSteps) => ({
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
    ]
}

function linearizeSequential(step: ParsedSequantial, probability: number): Vertical<LinearizedRow> {
    let result: Vertical<LinearizedRow> = linearize(step.children[0], probability)
    for (let i = 1; i < step.children.length; i++) {
        result = linearizeSequentialStep(result, step.children[i])
    }
    return result
}

function linearizeSequentialStep(prev: Vertical<LinearizedRow>, step: ParsedSteps): Vertical<LinearizedRow> {
    return prev.reduce<Vertical<LinearizedRow>>(
        (result, row) =>
            result.concat(
                linearize(step, row.probability).map((nextRow) => ({
                    probability: nextRow.probability,
                    horizontal: [...row.horizontal, ...nextRow.horizontal],
                }))
            ),
        []
    )
}

function linearizeParallel(step: ParsedParallel, probability: number): Vertical<LinearizedRow> {
    return step.children.reduce<Vertical<LinearizedRow>>((prev, step) => [...prev, ...linearize(step, probability)], [])
}

function linearizeSwitch(step: ParsedSwitch, probability: number): Vertical<LinearizedRow> {
    const p = probability / (step.children.length - 1)
    return step.children.slice(1).reduce<Vertical<LinearizedRow>>(
        (prev, childStep, i) => [
            ...prev,
            ...linearize(childStep, p).map<LinearizedRow>((nextSteps) => ({
                horizontal: [
                    {
                        type: "filter",
                        condition: step.children[0],
                        values: step.cases[i],
                    },
                    ...nextSteps.horizontal,
                ],
                probability: nextSteps.probability,
            })),
        ],
        []
    )
}

function linearizeSymbol(step: ParsedSymbol, probability: number): Vertical<LinearizedRow> {
    throw new Error("not implemented")
}
