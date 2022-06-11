import {
    ParsedIf,
    ParsedParallel,
    ParsedRandom,
    ParsedSequantial,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
} from "../parser"
import { diffArrays } from "diff"



export type LinearizedStep =
    | (ParsedSteps & {
          type: Exclude<ParsedSteps["type"], "random" | "if" | "sequential" | "parallel" | "switch" | "symbol">
      })
    | { type: "filter-conditional"; condition: ParsedSteps; value: any }
    | { type: "filter-random"; probability: number }

type LinearizedSteps = Array<LinearizedStep>

export function linearize(step: ParsedSteps): Array<LinearizedSteps> {
    switch (step.type) {
        case "random":
            return linearizeRandom(step)
        case "if":
            return linearizeIf(step)
        case "sequential":
            return linearizeSequential(step)
        case "parallel":
            return linearizeParallel(step)
        case "switch":
            return linearizeSwitch(step)
        case "symbol":
            return linearizeSymbol(step)
        default:
            return [[step]]
    }
}

function linearizeRandom(step: ParsedRandom): Array<LinearizedSteps> {
    return step.children.reduce<Array<LinearizedSteps>>(
        (prev, childStep, i) => [
            ...prev,
            ...linearize(childStep).map<LinearizedSteps>((nextSteps) => [
                {
                    type: "filter-random",
                    probability: step.probabilities[i],
                },
                ...nextSteps,
            ]),
        ],
        []
    )
}

function linearizeIf(step: ParsedIf): Array<LinearizedSteps> {
    return [
        ...linearize(step.children[1]).map<LinearizedSteps>((nextSteps) => [
            {
                type: "filter-conditional",
                condition: step.children[0],
                value: true,
            },
            ...nextSteps,
        ]),
        ...linearize(step.children[2]).map<LinearizedSteps>((nextSteps) => [
            {
                type: "filter-conditional",
                condition: step.children[0],
                value: true,
            },
            ...nextSteps,
        ]),
    ]
}

function linearizeSequential(step: ParsedSequantial): Array<LinearizedSteps> {
    return step.children.slice(1).reduce((prev, step) => {
        const nextLinearizations = linearize(step)
        return prev.reduce<Array<LinearizedSteps>>((result, steps) => result.concat(nextLinearizations.map((nextSteps) => [...steps, ...nextSteps])), [])
    }, linearize(step.children[0]))
}

function linearizeParallel(step: ParsedParallel): Array<LinearizedSteps> {
    return step.children.reduce<Array<LinearizedSteps>>((prev, step) => [...prev, ...linearize(step)], [])
}

function linearizeSwitch(step: ParsedSwitch): Array<LinearizedSteps> {
    return step.children.slice(1).reduce<Array<LinearizedSteps>>(
        (prev, childStep, i) => [
            ...prev,
            ...linearize(childStep).map<LinearizedSteps>((nextSteps) => [
                {
                    type: "filter-conditional",
                    condition: step.children[0],
                    value: step.cases[i + 1],
                },
                ...nextSteps,
            ]),
        ],
        []
    )
}

function linearizeSymbol(step: ParsedSymbol): Array<LinearizedSteps> {
    throw new Error("not implemented")
}