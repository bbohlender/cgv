import { FullValue } from "../editor"
import { Operations } from "../interpreter"
import { ParsedGrammarDefinition, ParsedSteps } from "../parser"
import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps } from "../util"

export function concretize(
    grammar: HierarchicalParsedGrammarDefinition,
    operations: Operations<any, any>
): ParsedGrammarDefinition {
    throw new Error("method not implemented")
}

export function deriveConcreteIndices(
    grammar: HierarchicalParsedGrammarDefinition,
    operations: Operations<any, any>
): Map<HierarchicalParsedSteps, Array<FullValue>> {
    const beforeIndicesMap = new Map<ParsedSteps, Array<string>>()
    const fullIndicesMap = new Map<ParsedSteps, Array<FullValue>>()
    throw new Error("method not implemented")
    //return fullIndicesMap
}

export function concretizeDerivedIndices(
    indexMap: Map<HierarchicalParsedSteps, Array<FullValue>>
): ParsedGrammarDefinition {
    throw new Error("method not implemented")
}

/*async function concretize<T>(
    grammar: ParsedGrammarDefinition,
    operations: Operations<T, any>,
    options: InterpreterOptions<T, any>
): Promise<ParsedSteps> {
    const values = await lastValueFrom(
        EMPTY.pipe(
            interprete<T, ParsedGrammarDefinition>(grammar, operations, {
                ...options,
                annotateBeforeStep: (value, step) => {
                    //TODO
                },
                combineAnnotations: (values) => {
                    //TODO
                },
            }),
            toArray()
        )
    )
    const grammars = values.map(({ annotation }) => annotation)
    //TODO: unify commons of grammars (using summarize and parallel unifier)
    return null as any
}
*/
