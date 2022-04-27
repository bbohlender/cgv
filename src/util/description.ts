import { traverseSteps } from "."
import type {
    AbstractParsedGrammarDefinition,
    AbstractParsedSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
} from "../parser"

export function getDescription<T>(
    globalDescriptions: AbstractParsedGrammarDefinition<T>,
    descriptionName: string,
    includeDepdencies: boolean
): AbstractParsedGrammarDefinition<T> {
    const localDescription = globalDescriptions.filter((noun) => isNounOfDescription(descriptionName, noun.name))
    if (includeDepdencies) {
        const dependencies = getDependencies(globalDescriptions, descriptionName) //TODO
        localDescription.push(...globalDescriptions /*.filter((noun) => dependencies.includes(noun.name))*/)
    }
    return localDescription
}

export function isNounOfDescription(descriptionName: string, nounName: string): boolean {
    return nounName.startsWith(`${descriptionName}@`)
}

export function getDescriptionOfNoun(nounName: string): string {
    const splits = nounName.split("@")
    if (splits.length !== 2) {
        throw new Error(`"${nounName}" expected to have exactly one "@"`)
    }
    return splits[0]
}

export function getDescriptionRootStep<T>(
    globalDescription: AbstractParsedGrammarDefinition<T>,
    localDescriptionName: string
): AbstractParsedSteps<T> | undefined {
    return globalDescription.find((noun) => isNounOfDescription(localDescriptionName, noun.name))?.step
}

function getDependencies(description: ParsedGrammarDefinition, descriptionName: string): Array<string> {
    //TODO: get the dependecy tree (tree shaking)
    const dependencies = new Set<string>()
    for (const noun of description) {
        if (!isNounOfDescription(descriptionName, noun.name)) {
            continue
        }
        traverseSteps(noun.step, (step) => {
            if (step.type === "symbol" && !isNounOfDescription(descriptionName, step.identifier)) {
                dependencies.add(step.identifier)
            }
        })
    }
    return Array.from(dependencies)
}

export function localizeStepsSerializer(descriptionName: string, step: ParsedSteps | string): string | undefined {
    const name = typeof step === "string" ? step : step.type === "symbol" ? step.identifier : undefined
    if (name == null) {
        return
    }

    if (name.startsWith(`${descriptionName}@`)) {
        return name.slice(descriptionName.length + 1)
    }
}

export function globalizeStepsSerializer(descriptionName: string, step: ParsedSteps | string): string | undefined {
    const name = typeof step === "string" ? step : step.type === "symbol" ? step.identifier : undefined
    if (name != null && !name.includes("@")) {
        return `${descriptionName}@${name}`
    }
}

export function globalizeDescriptions(description: ParsedGrammarDefinition, descriptionName: string): void {
    for (const noun of description) {
        noun.name = `${descriptionName}@${noun.name}`
        globalizeStepsRecursive(noun.step, descriptionName)
    }
}

function globalizeStepsRecursive(step: ParsedSteps, descriptionName: string): void {
    if (step.type === "symbol" && !step.identifier.includes("@")) {
        step.identifier = `${descriptionName}@${step.identifier}`
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
