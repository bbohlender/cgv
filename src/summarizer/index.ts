import { AbstractParsedNoun, ParsedGrammarDefinition, ParsedRandom, ParsedSteps } from "../parser"
import { combine, isCombineable } from "./combine"
import {
    align,
    NestedGroup,
    NestGroupConfig,
    nestGroups,
    NestVerticalGroups,
    nestVerticalGroups as defaultNestVerticalGroups,
} from "./group"
import { combineLinearizationResult, LinearizationResult, linearize, LinearizedStep } from "./linearize"

export type Horizontal<T> = Array<T>
export type Vertical<T> = Array<T>

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

function linearizeSteps(steps: Array<ParsedSteps>, nounResolvers: Array<(identifier: string) => ParsedSteps>) {
    const probability = 1 / steps.length
    return steps
        .map((step, i) => linearize(step, nounResolvers[i], probability))
        .reduce((prev, result) => combineLinearizationResult(prev, result, true))
}

export function summarizeLinearization(
    { seperationMatrix, vertical }: LinearizationResult,
    createNoun: (identifier: string) => AbstractParsedNoun<unknown>
): ParsedSteps {
    const grid = align<LinearizedStep>(vertical, () => ({ type: "this" }), isCombineable)
    const config: NestGroupConfig<LinearizedStep, ParsedSteps> = {
        createNoun,
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

/**
 * @param probabilities probability distribution => should sum up to one; if undefined equal distribution is used
 */
export function summarizeSteps(
    steps: Array<ParsedSteps>,
    createNoun: (identifier: string) => AbstractParsedNoun<unknown>,
    nounResolvers: Array<(identifier: string) => ParsedSteps>
): ParsedSteps {
    return summarizeLinearization(linearizeSteps(steps, nounResolvers), createNoun)
}

const nestVerticalGroups: NestVerticalGroups<LinearizedStep, ParsedSteps> = (
    config,
    xStart,
    xEnd,
    yList,
    probability
) => {
    //find first occurance in columns of filter / noun
    let xStartSubsection: number | undefined
    let startStep:
        | { type: "filterStart"; condition: LinearizationResult; values: Array<any> }
        | { type: "nounStart"; identifier: string }
        | undefined
    outer: for (let x = xStart; x < xEnd; x++) {
        for (const y of yList) {
            const step = config.rows[y].horizontal[x]
            if (step.type === "filterStart" || step.type === "nounStart") {
                xStartSubsection = x
                startStep = step
                break outer
            }
        }
    }

    if (xStartSubsection == null || startStep == null) {
        return defaultNestVerticalGroups(config, xStart, xEnd, yList, probability)
    }

    const result: NestedGroup<ParsedSteps> = []

    if (xStartSubsection - xStart > 0) {
        result.push(...nestGroups(config, xStart, xStartSubsection, yList, probability))
    }

    //beginning from that index search for a place where every start has an end (counted per row)
    let xEndSubsection = xStartSubsection
    const startEndRelations = new Array(yList.length).fill(0)
    let allZero = false
    while (!allZero && xEndSubsection < xEnd) {
        allZero = true
        for (const y of yList) {
            const step = config.rows[y].horizontal[xEndSubsection]
            if (step.type === "filterStart" || step.type === "nounStart") {
                startEndRelations[y]++
            } else if (step.type === "filterEnd" || step.type === "nounEnd") {
                startEndRelations[y]--
            }
            if (startEndRelations[y] !== 0) {
                allZero = false
            }
        }
        xEndSubsection++
    }

    //replace filterStart & respective filterEnd with "this"

    const newConfig = {
        rows,
        ...config,
    }

    if (startStep.type === "filterStart") {
        const valueGroups: Array<{ values: Array<any>; yList: Array<number> }> = []
        //TODO: group by values
        //TODO: multiply probability of the children of conditional steps with amount of filter outputs (for "if" that would be 2)
    } else {
        const noun = config.createNoun(startStep.identifier)
        noun.step = translateNestedGroup(nestGroups(newConfig))
        result.push({
            compatible: true,
            vertical: [
                {
                    group: {
                        type: "symbol",
                        identifier: noun.name,
                    },
                    probability,
                },
            ],
        })
    }

    if (xEnd - (xEndSubsection + 1) > 0) {
        result.push(...nestGroups(config, xEndSubsection + 1, xEnd, yList, probability))
    }

    return result
}

export function summarize(...descriptions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const result: ParsedGrammarDefinition = []
    const firstRootNode = descriptions[0][0]
    const newNode: AbstractParsedNoun<unknown> = {
        name: firstRootNode.name,
        step: { type: "this" },
    }
    result.push(newNode)
    newNode.step = summarizeSteps(
        descriptions.map((description) => description[0].step),
        (identifier) => {
            const name = findFreeName(identifier, result)
            const noun: AbstractParsedNoun<unknown> = {
                name,
                step: { type: "this" },
            }
            result.push(noun)
            return noun
        },
        descriptions.map((description) => (identifier) => {
            const noun = description.find(({ name }) => identifier === name)
            if (noun == null) {
                throw new Error(`unknown noun "${identifier}"`)
            }
            return noun.step
        })
    )
    return result
}

function findFreeName(identifier: string, description: ParsedGrammarDefinition): string {
    for (const { name } of description) {
        if (name === identifier) {
            return findFreeName(`${identifier}'`, description)
        }
    }
    return identifier
}
