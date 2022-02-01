import { MatrixEntriesObservable, InterpretionValue, Operations, parse, interprete } from "cgv"
import { useMemo } from "react"

export function useInterpretion<T>(
    text: string,
    changes: MatrixEntriesObservable<InterpretionValue<T>>,
    operations: Operations<T>
) {
    return useMemo(() => {
        try {
            const grammar = parse(text)
            return [interprete<T>(changes, grammar, operations), undefined] as const
        } catch (error: any) {
            return [undefined, error.message] as const
        }
    }, [text, changes])
}
