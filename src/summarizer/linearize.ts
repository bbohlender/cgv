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


type LinearizedStep =
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
    return step.children.slice(1).reduce((prev, step) => prev.reduce((x, nextSteps) => , prev), linearize(step.children[0]))
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

type Partition = { similar: boolean, alignments: Array<Array<LinearizedStep>> }

function linearizeSymbol(step: ParsedSymbol): Array<LinearizedSteps> {}

function alignAndPartition(linearizations: Array<LinearizedSteps>): Array<Partition> {

    const mergedLinearization: LinearizedSteps //TODO: contains all operations (just for alignment), while the real linearizations get filled with "this" if they are not similar

    const similars = new Array(linearizations[0].length).fill(true)
    const alignedLinearizations: Array<LinearizedSteps> = [
        [...linearizations[0]]
    ]
    
    for(let i = 1; i < linearizations.length; i++) {
        const alignedLinearization = [...linearizations[i]]
        const changes = diffArrays<LinearizedStep, LinearizedStep>(mergedLinearization, alignedLinearization, {
            comparator: isSimilar
        })
        let i1 = 0
        let i2 = 0
        for(const change of changes) {
            const length = change.value.length
            //TODO: insert inton all alignedLinearizations and alignedLinearization
            if(change.added) {
                i1 += length
            } else if(change.removed) {
                i2 += length
            } else {
                i1 += length
                i2 += length
            }
        }
    }

    const partitions: Array<Partition> = []
    for(let i = 0; i < targetLinearization.length; i++) {
        const lastPartionSimilar: boolean | undefined = partitions.length === 0 ? undefined : partitions[partitions.length - 1].similar
        const currentPartionSimilar: boolean = similars[i]
        if(lastPartionSimilar === currentPartionSimilar) {
            partitions.push({
                similar: currentPartionSimilar,
                alignments: [alignedLinearizations.map((steps) => steps[i])]
            })
        } else {
            partitions[partitions.length - 1].alignments.push(alignedLinearizations.map(steps => steps[i]))
        }
    }
    return partitions
}

function combinePartitions(partitions: Array<Partition>, combineUnsimilar: (linearizations: Array<LinearizedSteps>) => ParsedSteps): ParsedSteps {
    const combined = partitions.map(({ similar, alignments }) => similar ? combineSimilar(alignments) : combineUnsimilar(alignments) )
    if(combined.length === 1) {
        return combined[0]
    }
    return {
        type: "parallel",
        children: combined
    }
}

function combineSimilar(alignments: Array<Array<LinearizedStep>>): ParsedSteps {
    //TBD
}

export function summarize(...steps: Array<ParsedSteps>): ParsedSteps {
    //TODO: linearize all
    //TODO: matching
    //TODO: combineSimilar as via random
    //TODO: delinearize all
}

function combineUnsimilarAsParallel(linearizations: Array<LinearizedSteps>): ParsedSteps {

}

export function delinearize(linearizations: Array<LinearizedSteps>): ParsedSteps {
    const partitions = alignAndPartition(linearizations)
    return combinePartitions(partitions, combineUnsimilarAsParallel)
}

function isSimilar(s1: LinearizedStep | ParsedSteps, s2: LinearizedStep | ParsedSteps): boolean {
    if(s1.type !== s2.type) {
        return false
    }
    switch(s1.type) {
        case "null":
        case "this":
        case "return":
        case "filter-random":
            return true
        case "filter-conditional":
            return s1.value === (s2 as typeof s1).value
        case "getVariable":
            return s1.identifier === (s2 as typeof s1).identifier
        case "random":
            return allUnordered(s1.children, (s2 as typeof s1).children, isSimilar)
        case "if":
            return allOrdered(s1.children, (s2 as typeof s1).children, isSimilar)
        case "sequential":
            return allOrdered(s1.children, (s2 as typeof s1).children, isSimilar)
        case "parallel":
            return allUnordered(s1.children, (s2 as typeof s1).children, isSimilar)
        case "switch":
            return allUnordered(s1.children, (s2 as typeof s1).children, isSimilar, (i1, i2) => s1.cases[i1] === (s2 as typeof s1).cases[i2])
        case "symbol":
            return isSimilar(..., ...)
        case "raw":
            return s1.value === (s2 as typeof s1).value 
        case "setVariable":
            return s1.identifier === (s2 as typeof s1).identifier && isSimilar(s1.children[0], (s2 as typeof s1).children[0])
        case "operation":
            return s1.identifier === (s2 as typeof s1).identifier && childrenAreSimilar(s1.children, (s2 as typeof s1).children)
        default:
            return childrenAreSimilar(s1.children, (s2 as typeof s1).children)
    }
}

function allOrdered<T>(a1: Array<T>, a2: Array<T>, fn: (v1: T, v2: T) => boolean): boolean {
    if(a1.length != a2.length) {
        return false
    }
    for(let i = 0; i < a1.length; i++) {
        if(!fn(a1[i], a2[i])) {
            return false
        }
    }
    return true
}

function allUnordered(): boolean {

}

function childrenAreSimilar(children1: Array<ParsedSteps>, children2: Array<ParsedSteps>): boolean {

}
