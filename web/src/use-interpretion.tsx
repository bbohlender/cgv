import { InterpretionValue, Operations, parse, interprete, Matrix } from "cgv"
import { useMemo } from "react"
import { Observable } from "rxjs"

export function useInterpretion<T>(
    text: string,
    input: Observable<Matrix<InterpretionValue<T>>>,
    operations: Operations
) {
    return useMemo(() => {
        try {
            const grammar = parse(text)
            return [input.pipe(interprete<T>(grammar, operations)), undefined] as const
        } catch (error: any) {
            return [undefined, JSON.stringify(error.message)] as const
        }
    }, [text, input])
}
