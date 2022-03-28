import { AbstractParsedGrammarDefinition, AbstractParsedSteps, ParsedGrammarDefinition, ParsedSteps } from ".."

export type HierarchicalInfo =
    | {
          parent: string
          childrenIndex?: undefined
      }
    | {
          parent: HierarchicalParsedSteps
          childrenIndex: number
      }

export type HierarchicalParsedSteps = AbstractParsedSteps<HierarchicalInfo>

export type HierarchicalParsedGrammarDefinition = AbstractParsedGrammarDefinition<HierarchicalInfo>

export function toHierachical(parsed: ParsedGrammarDefinition): HierarchicalParsedGrammarDefinition {
    return Object.entries(parsed).reduce(
        (prev, [key, value]) => ({ ...prev, [key]: toHierachicalSteps(value, key) }),
        {}
    )
}

export function toHierachicalSteps(
    steps: ParsedSteps,
    parent: HierarchicalParsedSteps | string,
    childrenIndex?: number
): HierarchicalParsedSteps {
    const result: any = {
        ...steps,
        parent,
        childrenIndex,
    }
    result.children = steps.children?.map((child, i) => toHierachicalSteps(child, result, i))
    return result
}
