import { ParsedNounReference, ParsedDescription, ParsedTransformation } from "../parser"
import { align, NestGroupConfig, nestGroups, Row } from "./group"
import { combineLinearizationResult, LinearizationResult, linearize, LinearizedStep } from "./linearize"
import { nestVerticalGroups } from "./nest-vertical"
import { rowSimilarity } from "./row-similarity"
import { stepSimilarity } from "./step-similarity"
import { translateNestedGroup } from "./translate-nested"

export type ConfigAddition = {
    createNoun: (identifier: string) => ParsedNounReference<unknown>
    minValueSimilarity: number
}

export type Horizontal<T> = Array<T>
export type Vertical<T> = Array<T>

export function summarizeLinearization(
    { seperationMatrix, vertical }: LinearizationResult,
    createNoun: (identifier: string) => ParsedNounReference<unknown>,
    probability = 1
): ParsedTransformation {
    const minValueSimilarity = 0.1
    const minRowSimilarity = 0.1
    const grid = align<LinearizedStep>(
        vertical,
        () => ({ type: "this" }),
        (v1, v2) => stepSimilarity(v1, v2) >= minValueSimilarity
    )
    const config: NestGroupConfig<LinearizedStep, ParsedTransformation, ConfigAddition> = {
        createNoun,
        nestVerticalGroups,
        filterValue: (step) => step.type != "this",
        minRowSimilarity,
        minValueSimilarity,
        rowSimilarity,
    }

    const nestedGroups = nestGroups(grid, seperationMatrix, config, undefined, undefined, undefined, probability)
    return translateNestedGroup(nestedGroups)
}

/**
 * @param probabilities probability distribution => should sum up to one; if undefined equal distribution is used
 */
export function summarizeSteps(
    steps: Array<ParsedTransformation>,
    createNoun: (identifier: string) => ParsedNounReference<unknown>,
    nounResolvers: Array<(identifier: string) => ParsedTransformation>
): ParsedTransformation {
    const probability = 1 / steps.length
    return summarizeLinearization(
        steps
            .map((step, i) => linearize(step, nounResolvers[i], probability))
            .reduce((prev, result) => combineLinearizationResult(prev, result, true)),
        createNoun
    )
}

export function summarize(...descriptions: Array<ParsedDescription>): ParsedDescription {
    const result: ParsedDescription = []
    const firstRootNode = descriptions[0][0]
    const newNode: ParsedNounReference<unknown> = {
        name: firstRootNode.name,
        step: { type: "this" },
    }
    result.push(newNode)
    newNode.step = summarizeSteps(
        descriptions.map((description) => description[0].step),
        (identifier) => {
            const name = findFreeName(identifier, result)
            const noun: ParsedNounReference<unknown> = {
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

function findFreeName(identifier: string, description: ParsedDescription): string {
    for (const { name } of description) {
        if (name === identifier) {
            return findFreeName(`${identifier}'`, description)
        }
    }
    return identifier
}
