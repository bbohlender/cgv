import produce, { freeze } from "immer"
import { filterNull, traverseSteps } from "."
import type {
    AbstractParsedGrammarDefinition,
    AbstractParsedSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
} from "../parser"
import {
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalPath,
    toHierarchicalSteps,
} from "./hierarchical"

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

export function globalizeNoun(name: string, descriptionName: string | undefined): string {
    if (descriptionName == null) {
        throw new Error(`unable to globalize noun with undefined description name`)
    }
    if (name.includes("@")) {
        return name
    }
    return `${name}@${descriptionName}`
}

export function localizeNoun(name: string, descriptionName: string | undefined): string {
    descriptionName = descriptionName ?? getDescriptionOfNoun(name)
    if (!name.endsWith(`@${descriptionName}`)) {
        return name
    }
    return name.slice(0, -descriptionName.length - 1)
}

function transformStep(
    transformFn: (name: string, descriptionName: string | undefined) => string,
    step: ParsedSteps,
    descriptionName: string | undefined,
    ...basePath: HierarchicalPath
): HierarchicalParsedSteps {
    return produce(step, (draft) => {
        transformStepOnDraft(draft, descriptionName, transformFn)
        return toHierarchicalSteps(draft, ...basePath)
    }) as HierarchicalParsedSteps
}
function transformStepOnDraft(
    step: ParsedSteps,
    descriptionName: string | undefined,
    transformFn: (name: string, descriptionName: string | undefined) => string
): void {
    if (step.type === "symbol") {
        step.identifier = transformFn(step.identifier, descriptionName)
        return
    }
    if (step.children == null) {
        return
    }
    for (const child of step.children) {
        transformStepOnDraft(child, descriptionName, transformFn)
    }
}

export const globalizeStep = transformStep.bind(null, globalizeNoun)
export const localizeStep = transformStep.bind(null, localizeNoun)

function transformDescription<T>(
    transformFn: (name: string, descriptionName: string | undefined) => string,
    description: ParsedGrammarDefinition,
    descriptionName: string | undefined
): HierarchicalParsedGrammarDefinition {
    return freeze(
        description.map((noun) => {
            const name = transformFn(noun.name, descriptionName)
            return {
                name,
                step: transformStep(transformFn, noun.step, descriptionName, name),
            }
        })
    )
}

export const globalizeDescription = transformDescription.bind(null, globalizeNoun)
export const localizeDescription = transformDescription.bind(null, localizeNoun)

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
