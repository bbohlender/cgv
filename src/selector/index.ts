import { ParsedDescription, ParsedTransformation, ParsedDescription, ParsedTransformation } from "../parser"

// accumulate to 1
export type Distributions = Array<Array<number>>
export type Instance = Array<number>
export type Population = Array<Instance>

export function findDistributions(step: ParsedTransformation, dependencies: ParsedDescription): Distributions {
    return findStepDistributions(step).concat(
        dependencies.reduce<Distributions>((prev, noun) => prev.concat(findStepDistributions(noun.step)), [])
    )
}

function findStepDistributions(step: ParsedTransformation): Distributions {
    let basis: Distributions = []
    if ("children" in step && step.children != null) {
        basis = step.children.reduce<Distributions>((prev, child) => prev.concat(findStepDistributions(child)), basis)
    }
    if (step.type === "random") {
        return [...basis, step.probabilities]
    }
    return basis
}

export function applyInstance<T>(
    selections: Instance,
    step: ParsedTransformation<T>,
    dependencies: ParsedDescription
): [ParsedTransformation<T>, ParsedDescription<T>] {
    const indexRef = { ref: 0 }
    return [
        applyStepInstance(selections, step, indexRef),
        dependencies.map(({ name, step }) => ({
            name,
            step: applyStepInstance(selections, step, indexRef),
        })),
    ]
}

function applyStepInstance<T>(
    selections: Instance,
    step: ParsedTransformation<T>,
    indexRef: { ref: number }
): ParsedTransformation<T> {
    let children: Array<ParsedTransformation<T>> | undefined
    if ("children" in step && step.children != null) {
        children = step.children.map((step) => applyStepInstance(selections, step, indexRef))
    }
    if (step.type === "random") {
        return children![selections[indexRef.ref++]]
    }
    return { ...step, children }
}

export function generateInitialPopulation(distributions: Distributions, size: number): Population {
    return new Array(size).fill(undefined).map(() => distributions.map(selectRandom))
}

function selectRandom(distribution: Array<number>): number {
    const random = Math.random()
    let sum = 0
    for (let i = 0; i < distribution.length; i++) {
        sum += distribution[i]
        if (random <= sum) {
            return i
        }
    }
    return distribution.length - 1
}

/**
 * @param variation 0 to 1
 */
export function procreatePopulation(
    distribution: Distributions,
    size: number,
    fromInstance: Instance,
    variation: number
): Population {
    const result: Population = [fromInstance]
    for (let i = 1; i < size; i++) {
        result[i] = distribution.map((distribution, i) =>
            Math.random() < variation ? selectRandom(distribution) : fromInstance[i]
        )
    }
    return result
}
