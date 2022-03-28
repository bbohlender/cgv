import { EMPTY, lastValueFrom } from "rxjs"
import { interprete, InterpreterOptions, Operations, toArray } from "../interpreter"
import { ParsedGrammarDefinition, ParsedSteps } from "../parser"

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
