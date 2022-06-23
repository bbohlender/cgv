import { LinearizationResult, LinearizedStep } from "./linearize"

/**
 * @returns similarity of the row steps (1: equal, 0: unqeual, anything in between: some childrens are to some degree similar)
 */
export function stepSimilarity(s1: LinearizedStep, s2: LinearizedStep): number {
    const { maxSimilarity, similarity } = stepSimilarityCount(s1, s2)
    return similarity / maxSimilarity
}

function stepSimilarityCount(s1: LinearizedStep, s2: LinearizedStep): { similarity: number; maxSimilarity: number } {
    if (s1.type !== s2.type) {
        return { similarity: 0, maxSimilarity: 1 }
    }
    switch (s1.type) {
        case "filterStart":
            if (typeof s1.values[0] !== typeof (s2 as typeof s1).values[0]) {
                return {
                    similarity: 0,
                    maxSimilarity: 1,
                }
            }
            break
        case "setVariable":
        case "operation":
            if (s1.identifier !== (s2 as typeof s1).identifier) {
                return {
                    similarity: 0,
                    maxSimilarity: 1,
                }
            }
            break
        case "getVariable":
        case "nounStart":
            return {
                similarity: s1.identifier === (s2 as typeof s1).identifier ? 1 : 0,
                maxSimilarity: 1,
            }
        case "raw":
            return {
                similarity: s1.value === (s2 as typeof s1).value ? 1 : 0,
                maxSimilarity: 1,
            }
        case "filterEnd":
        case "nounEnd":
            return { similarity: 1, maxSimilarity: 1 }
    }
    if (s1.children == null) {
        return {
            similarity: 1,
            maxSimilarity: 1,
        }
    }
    const { maxSimilarity, similarity } = stepChildrenSimilarity(s1.children, (s2 as typeof s1).children)
    return {
        maxSimilarity: maxSimilarity + 1,
        similarity: similarity + 1,
    }
}

function stepChildrenSimilarity(
    c1: Array<LinearizationResult>,
    c2: Array<LinearizationResult>
): { similarity: number; maxSimilarity: number } {
    let similarity = 0
    let maxSimilarity = 0
    for (let i = 0; i < Math.max(c1.length, c2.length); i++) {
        const child1 = c1[i]
        const child2 = c2[i]
        if (child1 == null || child2 == null) {
            maxSimilarity++
            continue
        }
        const { maxSimilarity: maxS, similarity: s } = linearizationSimilarity(child1, child2)
        similarity += s
        maxSimilarity += maxS
    }
    return {
        similarity,
        maxSimilarity,
    }
}

function linearizationSimilarity(
    l1: LinearizationResult,
    l2: LinearizationResult
): { similarity: number; maxSimilarity: number } {
    //TBD: more complex scenarios
    if (
        l1.vertical.length === 1 &&
        l1.vertical[0].horizontal.length === 1 &&
        l2.vertical.length === 1 &&
        l2.vertical[0].horizontal.length === 1
    ) {
        return stepSimilarityCount(l1.vertical[0].horizontal[0], l2.vertical[0].horizontal[0])
    }
    return {
        similarity: 1,
        maxSimilarity: 2,
    }
}
