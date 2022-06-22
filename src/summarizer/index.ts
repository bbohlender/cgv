import { AbstractParsedNoun, ParsedGrammarDefinition, ParsedRandom, ParsedSteps } from "../parser"
import { almostTheSame, shallowEqual } from "../util"
import { combine, isCombineable } from "./combine"
import {
    align,
    NestedGroup,
    NestGroupConfig,
    nestGroups,
    NestVerticalGroups,
    nestVerticalGroups as defaultNestVerticalGroups,
    Row,
    rowSimilarity,
} from "./group"
import {
    combineLinearizationResult,
    LinearizationResult,
    linearize,
    LinearizedStep,
    mapLinearizationResult,
} from "./linearize"

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

            if (almostTheSame(first.probability, 1)) {
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
    if (almostTheSame(probability, 1)) {
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
    createNoun: (identifier: string) => AbstractParsedNoun<unknown>,
    probability = 1
): ParsedSteps {
    const grid = align<LinearizedStep>(vertical, () => ({ type: "this" }), isCombineable)
    const config: NestGroupConfig<LinearizedStep, ParsedSteps> = {
        createNoun,
        rows: grid,
        combineGroup: combine,
        customNestVerticalGroups: nestVerticalGroups,
        filter: (step) => step.type != "filterEnd" && step.type != "nounEnd" && step.type != "this",
        isSameInGroup: isCombineable,
        minRowSimilarity: 0.3,
        rowsCombineableMatrix: seperationMatrix,
    }

    const nestedGroups = nestGroups(config, undefined, undefined, undefined, probability)
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
    let firstStartStep:
        | { type: "filterStart"; condition: LinearizationResult; values: Array<any> }
        | { type: "nounStart"; identifier: string }
        | undefined

    const openStart: Array<boolean> = new Array(yList.length).fill(false)
    const startEndRelations: Array<number> = new Array(yList.length).fill(0)
    for (let x = xStart; x < xEnd; x++) {
        for (let i = 0; i < yList.length; i++) {
            const y = yList[i]
            const step = config.rows[y].horizontal[x]
            if (step.type === "filterStart" || step.type === "nounStart") {
                xStartSubsection = x
                startEndRelations[i] = 1
                firstStartStep = step
                openStart[i] = true
            }
        }
        if (xStartSubsection != null) {
            break
        }
    }

    if (xStartSubsection == null || firstStartStep == null) {
        return defaultNestVerticalGroups(config, xStart, xEnd, yList, probability)
    }

    const probabilitySum = yList.reduce((prev, y) => prev + config.rows[y].probability, 0)
    const parentProbability = probabilitySum * probability
    const childProbability = 1 / probabilitySum

    const newRows: Vertical<Row<LinearizedStep>> = config.rows.map((row) => ({
        horizontal: [...row.horizontal],
        probability: row.probability,
    }))

    const result: NestedGroup<ParsedSteps> = []

    if (xStartSubsection - xStart > 0) {
        result.push(...nestGroups(config, xStart, xStartSubsection, yList, probability))
    }

    //beginning from that index search for a place where every start has an end (counted per row)
    let xEndSubsection = xStartSubsection + 1
    let allZero = false
    while (!allZero && xEndSubsection < xEnd) {
        allZero = true
        for (let i = 0; i < yList.length; i++) {
            const y = yList[i]
            const step = config.rows[y].horizontal[xEndSubsection]
            if (step.type === "filterStart" || step.type === "nounStart") {
                startEndRelations[i]++
            } else if (step.type === "filterEnd" || step.type === "nounEnd") {
                startEndRelations[i]--
            }
            if (startEndRelations[i] === 0) {
                if (openStart[i]) {
                    openStart[i] = false
                    newRows[y].horizontal[xEndSubsection] = { type: "this" }
                }
            } else {
                allZero = false
            }
        }
        xEndSubsection++
    }

    const newConfig: NestGroupConfig<LinearizedStep, ParsedSteps> = {
        ...config,
        rows: newRows,
    }

    let step: ParsedSteps

    if (firstStartStep.type === "filterStart") {
        const valueGroups: Array<{ values: Array<any>; yList: Array<number> }> = []
        const nonFilterRowsIndices: Array<number> = []
        const conditions: Array<LinearizationResult> = []

        let booleanValues = true

        for (let i = 0; i < yList.length; i++) {
            const y = yList[i]
            const startStep = config.rows[y].horizontal[xStartSubsection]

            if (startStep.type !== "filterStart") {
                nonFilterRowsIndices.push(i)
                continue
            }

            conditions[i] = mapLinearizationResult(startStep.condition, ({ horizontal }) => ({
                horizontal,
                probability: config.rows[y].probability * childProbability,
            }))

            if (startStep.values.length !== 1 || typeof startStep.values[0] !== "boolean") {
                booleanValues = false
            }

            newRows[y].probability *= startStep.options

            let valueGroup = valueGroups.find(({ values }) => shallowEqual(values, startStep.values))
            if (valueGroup == null) {
                valueGroup = { values: startStep.values, yList: [] }
                valueGroups.push(valueGroup)
            }
            valueGroup.yList.push(y)
        }

        for (const i of nonFilterRowsIndices) {
            const y1 = yList[i]
            let maxAvgSimilarity: number | undefined
            let maxValueGroup: { values: Array<any>; yList: Array<number> } | undefined
            for (const group of valueGroups) {
                let avgSimilarity = 0
                for (const y2 of group.yList) {
                    avgSimilarity += rowSimilarity(newConfig, probability, xStartSubsection + 1, xEndSubsection, y1, y2)
                }
                avgSimilarity /= group.yList.length
                if (maxAvgSimilarity == null || avgSimilarity > maxAvgSimilarity) {
                    maxAvgSimilarity = avgSimilarity
                    maxValueGroup = group
                }
            }
            maxValueGroup!.yList.push(i)
            conditions[i] = {
                vertical: [
                    {
                        horizontal: [{ type: "raw", value: maxValueGroup!.values[0] }],
                        probability: config.rows[y1].probability * childProbability,
                    },
                ],
                seperationMatrix: [[true]],
            }
        }

        const condition = summarizeLinearization(
            conditions.reduce((prev, cur) => combineLinearizationResult(prev, cur, true)),
            config.createNoun
        )

        if (booleanValues) {
            const thenYList = valueGroups.find(({ values }) => values[0] === true)?.yList
            const elseYList = valueGroups.find(({ values }) => values[0] === false)?.yList

            const thenStep: ParsedSteps =
                thenYList == null
                    ? { type: "null" }
                    : translateNestedGroup(
                          nestGroups(newConfig, xStartSubsection + 1, xEndSubsection, thenYList, childProbability)
                      )

            const elseStep: ParsedSteps =
                elseYList == null
                    ? { type: "null" }
                    : translateNestedGroup(
                          nestGroups(newConfig, xStartSubsection + 1, xEndSubsection, elseYList, childProbability)
                      )

            step = {
                type: "if",
                children: [condition, thenStep, elseStep],
            }
        } else {
            step = {
                type: "switch",
                cases: valueGroups.map(({ values }) => values),
                children: [
                    condition,
                    ...valueGroups.map(({ yList }) =>
                        translateNestedGroup(
                            nestGroups(newConfig, xStartSubsection! + 1, xEndSubsection, yList, childProbability)
                        )
                    ),
                ],
            }
        }
    } else {
        const noun = config.createNoun(firstStartStep.identifier)
        noun.step = translateNestedGroup(
            nestGroups(newConfig, xStartSubsection + 1, xEndSubsection, yList, childProbability)
        )
        step = {
            type: "symbol",
            identifier: noun.name,
        }
    }

    result.push({
        compatible: true,
        vertical: [
            {
                group: step,
                probability: parentProbability,
            },
        ],
    })

    if (xEnd - xEndSubsection > 0) {
        result.push(...nestGroups(config, xEndSubsection, xEnd, yList, probability))
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
