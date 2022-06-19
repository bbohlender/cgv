import { ParsedGrammarDefinition, ParsedRandom, ParsedSteps } from "../parser"
import { combine, isCombineable } from "./combine"
import { align, NestedGroup, NestGroupConfig, nestGroups, nestVerticalGroups } from "./group"
import { combineLinearizationResult, linearize, LinearizedStep } from "./linearize"

export type Horizontal<T> = Array<T>
export type Vertical<T> = Array<T>

//TODO: if compatible => still possible to be parallel (use algorithm like before)

export function translateNestedGroup(group: NestedGroup<ParsedSteps> | ParsedSteps): ParsedSteps {
    if (!Array.isArray(group)) {
        return group
    }
    const sequentialSteps = group.map<ParsedSteps>((column) => {
        const parallelSteps: Array<ParsedSteps> = []

        const workset = new Set(column.vertical)

        let currentRandom: ParsedRandom | undefined
        let currentProbability: number | undefined

        while (workset.size > 0) {
            const [first] = workset

            let row:
                | {
                      probability: number
                      group: ParsedSteps | NestedGroup<ParsedSteps>
                  }
                | undefined

            if (
                column.compatible &&
                currentRandom != null &&
                currentProbability != null &&
                (row = findBestFittingRow(workset, currentProbability)) != null
            ) {
                workset.delete(row)
                currentRandom.children.push(translateNestedGroup(row.group))
                currentRandom.probabilities.push(row.probability)
                currentProbability += row.probability
                continue
            }

            workset.delete(first)
            const step = translateNestedGroup(first.group)

            if (!column.compatible) {
                parallelSteps.push(wrapRandom(step, first.probability))
                currentRandom = undefined
                currentProbability = undefined
                continue
            }

            if (first.probability === 1) {
                parallelSteps.push(step)
                currentRandom = undefined
                currentProbability = undefined
                continue
            }

            currentRandom = {
                type: "random",
                children: [step],
                probabilities: [first.probability],
            }
            currentProbability = first.probability
            parallelSteps.push(currentRandom)
        }

        if (parallelSteps.length === 1) {
            return parallelSteps[0]
        }

        return {
            type: "parallel",
            children: parallelSteps,
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

function wrapRandom(step: ParsedSteps, probability: number): ParsedSteps {
    if (probability == 1) {
        return step
    }
    return { type: "random", children: [step], probabilities: [probability] }
}

function findBestFittingRow(
    set: Set<{
        probability: number
        group: ParsedSteps | NestedGroup<ParsedSteps>
    }>,
    probability: number
):
    | {
          probability: number
          group: ParsedSteps | NestedGroup<ParsedSteps>
      }
    | undefined {
    if (probability === 1) {
        return undefined //short cut so we don't have to loop
    }
    const searchFor = 1 - probability
    let best:
        | {
              probability: number
              group: ParsedSteps | NestedGroup<ParsedSteps>
          }
        | undefined
    let highestFittingProbability: number | undefined = undefined
    for (const entry of set) {
        if (entry.probability > searchFor) {
            continue
        }
        if (highestFittingProbability == null || entry.probability > highestFittingProbability) {
            highestFittingProbability = entry.probability
            best = entry
        }
    }
    return best
}

/**
 * @param probabilities probability distribution => should sum up to one; if undefined equal distribution is used
 */
export function summarizeSteps(steps: Array<ParsedSteps>, probabilities?: Array<number>): ParsedSteps {
    const p = probabilities ?? new Array(steps.length).fill(1 / steps.length)
    const { seperationMatrix, vertical } = steps
        .map((step, i) => linearize(step, p[i]))
        .reduce((prev, result) => combineLinearizationResult(prev, result, true))
    const grid = align<LinearizedStep>(vertical, () => ({ type: "this" }), isCombineable)
    const config: NestGroupConfig<LinearizedStep, ParsedSteps> = {
        rows: grid,
        combineGroup: combine,
        customNestVerticalGroups: nestVerticalGroups,
        filter: (step) => step.type != "this",
        isSameInGroup: isCombineable,
        minRowSimilarity: 0.3,
        rowsCombineableMatrix: seperationMatrix,
    }

    const nestedGroups = nestGroups(config)
    return translateNestedGroup(nestedGroups)
}

/*const nestVerticalGroups: NestVerticalGroups<LinearizedStep, ParsedSteps> = () => {
    throw new Error("method not implemented")
}*/

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
