import { Observable, of } from "rxjs"
import { Instance } from "."
import { operation, Operations, thisParameter } from "../.."
import { makeTranslationMatrix } from "./math"

function computeTranslate([instance, x, y, z]: Array<any>): Observable<Array<Instance>> {
    return of([{ ...instance, primitive: instance.primitive.applyMatrix(makeTranslationMatrix(x, y, z)) }])
}

export const operations: Operations<Instance> = {
    transform: (parameters) => (changes) =>
        changes.pipe(
            operation(computeTranslate, (values) => values, [thisParameter, ...parameters], undefined, 4)
        ),
}
