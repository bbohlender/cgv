import { traverseSteps } from "."
import type {
    AbstractParsedGrammarDefinition,
    AbstractParsedSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
} from "../parser"

/**
 * map of dependencies
 * key: name of description
 * values: array of nouns from other descriptions
 */
export type DependencyMap = {
    [Name in string]: Array<string> | undefined
}

export function computeDependencies<T>(globalDescriptions: AbstractParsedGrammarDefinition<T>): DependencyMap {
    const result: DependencyMap = {}
    for (const noun of globalDescriptions) {
        const nounDescriptionName = getDescriptionOfNoun(noun.name)
        traverseSteps(noun.step, (step) => {
            if (step.type !== "symbol") {
                return
            }
            const symbolDescriptionName = getDescriptionOfNoun(step.identifier)
            if (symbolDescriptionName === nounDescriptionName) {
                return
            }
            let entry = result[nounDescriptionName]
            if (entry == null) {
                entry = []
                result[nounDescriptionName] = entry
            }
            if (!entry.includes(step.identifier)) {
                entry.push(step.identifier)
            }
        })
    }
    return result
}

/**
 * @param dependencyMap if null the method returns the local description without dependencies
 */
export function getLocalDescription<T>(
    globalDescription: AbstractParsedGrammarDefinition<T>,
    dependencyMap: DependencyMap | undefined,
    localDescriptionName: string
): AbstractParsedGrammarDefinition<T> {
    const localDescriptionWithoutDependencies = globalDescription.filter((noun) =>
        isNounOfDescription(localDescriptionName, noun.name)
    )
    if (dependencyMap == null) {
        return localDescriptionWithoutDependencies
    }
    const dependencies = dependencyMap[localDescriptionName] ?? []
    return localDescriptionWithoutDependencies.concat(
        globalDescription.filter((noun) => dependencies.includes(noun.name))
    )
}

export function isNounOfDescription(descriptionName: string, nounName: string): boolean {
    return nounName.endsWith(`@${descriptionName}`)
}

export function globalizeNoun(name: string, descriptionName: string): string {
    if (name.includes("@")) {
        return name
    }
    return `${name}@${descriptionName}`
}

export function localizeNoun(name: string, descriptionName: string): string {
    if (!name.endsWith(`@${descriptionName}`)) {
        return name
    }
    return name.slice(0, -descriptionName.length - 1)
}

export function getDescriptionOfNoun(nounName: string): string {
    const splits = nounName.split("@")
    if (splits.length !== 2) {
        throw new Error(`"${nounName}" expected to have exactly one "@"`)
    }
    return splits[1]
}

export function getDescriptionRootStep<T>(
    globalDescription: AbstractParsedGrammarDefinition<T>,
    localDescriptionName: string
): AbstractParsedSteps<T> | undefined {
    return globalDescription.find((noun) => isNounOfDescription(localDescriptionName, noun.name))?.step
}

export function localizeStepsSerializer(descriptionName: string, step: ParsedSteps | string): string | undefined {
    const name = typeof step === "string" ? step : step.type === "symbol" ? step.identifier : undefined
    if (name == null) {
        return
    }

    return localizeNoun(name, descriptionName)
}

export function globalizeStepsSerializer(descriptionName: string, step: ParsedSteps | string): string | undefined {
    const name = typeof step === "string" ? step : step.type === "symbol" ? step.identifier : undefined
    if (name != null) {
        return globalizeNoun(name, descriptionName)
    }
}

export function globalizeDescription(description: ParsedGrammarDefinition, descriptionName: string): void {
    for (const noun of description) {
        noun.name = globalizeNoun(noun.name, descriptionName)
        globalizeStepsRecursive(noun.step, descriptionName)
    }
}

function globalizeStepsRecursive(step: ParsedSteps, descriptionName: string): void {
    if (step.type === "symbol") {
        step.identifier = globalizeNoun(step.identifier, descriptionName)
    }
    if (step.children == null) {
        return
    }
    for (const child of step.children) {
        globalizeStepsRecursive(child, descriptionName)
    }
}

export function exchangeDescription(
    globalDescription: ParsedGrammarDefinition,
    localDescription: ParsedGrammarDefinition,
    localDescriptionName: string
): ParsedGrammarDefinition {
    return globalDescription
        .filter((noun) => !isNounOfDescription(localDescriptionName, noun.name))
        .concat(localDescription)
}
