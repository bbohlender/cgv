import { freeze } from "immer"
import { filterNull, traverseSteps } from "."
import type {
    AbstractParsedGrammarDefinition,
    AbstractParsedSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
} from "../parser"

/**
 * map of dependencies
 * key: global noun name
 * values: array of global dependency nouns
 */
export type DependencyMap = { [Name in string]: Array<string> }

export function computeDependencies<T>(globalDescriptions: AbstractParsedGrammarDefinition<T>): DependencyMap {
    const directDependencyMap: Map<string, Array<string>> = new Map()
    for (const noun of globalDescriptions) {
        traverseSteps(noun.step, (step) => {
            if (step.type !== "symbol") {
                return
            }
            let entry = directDependencyMap.get(noun.name)
            if (entry == null) {
                entry = []
                directDependencyMap.set(noun.name, entry)
            }
            entry.push(step.identifier)
        })
    }
    const result: DependencyMap = {}
    for (const [name] of directDependencyMap) {
        result[name] = Array.from(new Set(getNestedDependencies(name, directDependencyMap)))
    }
    return result
}

function getNestedDependencies(
    noun: string,
    directDependencyMap: Map<string, Array<string>>,
    visited = new Set<string>()
): Array<string> {
    visited.add(noun)
    const directDependencies = directDependencyMap.get(noun)
    if (directDependencies == null) {
        return []
    }
    return directDependencies
        .filter((dependency) => !visited.has(dependency))
        .reduce<Array<string>>(
            (prev, dependency) => prev.concat(getNestedDependencies(dependency, directDependencyMap, visited)),
            directDependencies
        )
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
        return freeze(localDescriptionWithoutDependencies)
    }
    const nounsRealtedToLocalDescription = new Set(
        localDescriptionWithoutDependencies.reduce<Array<string>>((prev, noun) => {
            const dependencies = dependencyMap[noun.name]
            if (dependencies == null) {
                return prev
            }
            return prev.concat(dependencies.filter((noun) => !isNounOfDescription(localDescriptionName, noun)))
        }, [])
    )
    return freeze(
        localDescriptionWithoutDependencies.concat(
            globalDescription.filter((noun) => nounsRealtedToLocalDescription.has(noun.name))
        )
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
    return freeze(
        globalDescription
            .filter((noun) => !isNounOfDescription(localDescriptionName, noun.name))
            .concat(localDescription)
    )
}
