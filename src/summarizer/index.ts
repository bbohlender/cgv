import { ParsedGrammarDefinition, ParsedSteps } from "../parser"
import { combine, isCombineable } from "./combine"
import { align, NestedGroup, nestGroups } from "./group"
import { linearize, LinearizedRow, LinearizedStep } from "./linearize"

export type Horizontal<T> = Array<T>
export type Vertical<T> = Array<T>

export function translateNestedGroup(group: NestedGroup<ParsedSteps>): ParsedSteps {
    if (!Array.isArray(group)) {
        return group
    }

    const sequentialSteps = group.map<ParsedSteps>((vertical) => {
        const randomGroups: Array<Array<ParsedSteps>> = []
        const groupProbabilities: Array<Array<number>> = []

        let currentIndex = -1
        let currentProbability: number | undefined

        while (vertical.length > 0) {
            const i = currentProbability == null ? undefined : findBestFitIndex(vertical, currentProbability)
            const insertIndex = i ?? 0
            const { group, probability } = vertical[insertIndex]
            vertical.splice(insertIndex, 1)
            const step = translateNestedGroup(group)

            if (i == null) {
                //no best group found => create new group
                currentIndex++
                const probabilities: Array<number> = []
                const steps: Array<ParsedSteps> = []
                groupProbabilities[currentIndex] = probabilities
                randomGroups[currentIndex] = steps

                probabilities.push(probability)
                steps.push(step)
                currentProbability = probability
            } else {
                groupProbabilities[currentIndex].push(probability)
                randomGroups[currentIndex].push(step)
                currentProbability = probability + (currentProbability ?? 0)
            }
        }

        if (randomGroups.length === 1) {
            return wrapRandom(randomGroups[0], groupProbabilities[0])
        }

        return {
            type: "parallel",
            children: randomGroups.map((group, i) => wrapRandom(group, groupProbabilities[i])),
        }
    })

    if (sequentialSteps.length === 0) {
        return { type: "this" }
    }

    if (sequentialSteps.length === 1) {
        return sequentialSteps[0]
    }

    return {
        type: "sequential",
        children: sequentialSteps,
    }
}

function findBestFitIndex(
    vertical: Vertical<{
        probability: number
        group: NestedGroup<ParsedSteps>
    }>,
    probability: number
): number | undefined {
    if (probability === 1) {
        return undefined //short cut so we don't have to loop
    }
    const searchFor = 1 - probability
    let bestIndex: number | undefined = undefined
    let bestRestProbability: number | undefined = undefined
    for (let i = 0; i < vertical.length; i++) {
        const restProbability = vertical[i].probability % 1
        if (restProbability > searchFor) {
            continue
        }
        if (bestRestProbability == null || restProbability > bestRestProbability) {
            bestRestProbability = restProbability
            bestIndex = i
        }
    }
    return bestIndex
}

function wrapRandom(steps: Array<ParsedSteps>, probabilies: Array<number>): ParsedSteps {
    if (probabilies.length === 1 && probabilies[0] === 1) {
        return steps[0]
    }
    return { type: "random", children: steps, probabilities: probabilies }
}

export function splitFilter(grid: Vertical<LinearizedRow>): NestedGroup<ParsedSteps> {
    //TODO
    throw new Error("method not implemented")
}

/**
 * @param probabilities probability distribution => should sum up to one; if undefined equal distribution is used
 */
export function summarizeSteps(steps: Array<ParsedSteps>, probabilities?: Array<number>): ParsedSteps {
    const p = probabilities ?? new Array(steps.length).fill(1 / steps.length)
    const rows = steps.reduce<Array<LinearizedRow>>((prev, step, i) => prev.concat(linearize(step, p[i])), [])
    const grid = align<LinearizedStep>(rows, () => ({ type: "this" }), isCombineable)
    const nestedGroups = nestGroups<LinearizedStep, ParsedSteps>(
        grid,
        isCombineable,
        combine,
        (step) => step.type != "this",
        () => ({ type: "this" })
    )
    return translateNestedGroup(nestedGroups)
}

//TODO: keep grammar symbol names
export function summarize(...descriptions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const name = descriptions[0][0].name
    const step = summarizeSteps(descriptions.map((description) => description[0].step))
    return [
        {
            name,
            step,
        },
    ]
}
