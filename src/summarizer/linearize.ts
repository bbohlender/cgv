import { Horizontal, Vertical } from "."
import {
    ParsedIf,
    ParsedParallel,
    ParsedRandom,
    ParsedSequantial,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
} from "../parser"

export type LinearizedStep =
    | (ParsedSteps & {
          type: Exclude<ParsedSteps["type"], "random" | "if" | "sequential" | "parallel" | "switch" | "symbol">
      })
    | { type: "filter-conditional"; condition: ParsedSteps; value: any }
    | { type: "filter-random"; probability: number }

export function linearize(step: ParsedSteps): Vertical<Horizontal<LinearizedStep>> {
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

function linearizeRandom(step: ParsedRandom): Vertical<Horizontal<LinearizedStep>> {
    return step.children.reduce<Vertical<Horizontal<LinearizedStep>>>(
        (prev, childStep, i) => [
            ...prev,
            ...linearize(childStep).map<Horizontal<LinearizedStep>>((nextSteps) => [
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

function linearizeIf(step: ParsedIf): Vertical<Horizontal<LinearizedStep>> {
    return [
        ...linearize(step.children[1]).map<Horizontal<LinearizedStep>>((nextSteps) => [
            {
                type: "filter-conditional",
                condition: step.children[0],
                value: true,
            },
            ...nextSteps,
        ]),
        ...linearize(step.children[2]).map<Horizontal<LinearizedStep>>((nextSteps) => [
            {
                type: "filter-conditional",
                condition: step.children[0],
                value: true,
            },
            ...nextSteps,
        ]),
    ]
}

function linearizeSequential(step: ParsedSequantial): Vertical<Horizontal<LinearizedStep>> {
    return step.children.slice(1).reduce((prev, step) => {
        const nextLinearizations = linearize(step)
        return prev.reduce<Vertical<Horizontal<LinearizedStep>>>(
            (result, steps) => result.concat(nextLinearizations.map((nextSteps) => [...steps, ...nextSteps])),
            []
        )
    }, linearize(step.children[0]))
}

function linearizeParallel(step: ParsedParallel): Vertical<Horizontal<LinearizedStep>> {
    return step.children.reduce<Vertical<Horizontal<LinearizedStep>>>((prev, step) => [...prev, ...linearize(step)], [])
}

function linearizeSwitch(step: ParsedSwitch): Vertical<Horizontal<LinearizedStep>> {
    return step.children.slice(1).reduce<Vertical<Horizontal<LinearizedStep>>>(
        (prev, childStep, i) => [
            ...prev,
            ...linearize(childStep).map<Horizontal<LinearizedStep>>((nextSteps) => [
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

function linearizeSymbol(step: ParsedSymbol): Vertical<Horizontal<LinearizedStep>> {
    throw new Error("not implemented")
}
