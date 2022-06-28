import { Observable, Subscription, tap } from "rxjs"
import { Object3D } from "three"
import { Value } from "../.."
import { Primitive } from "."
import { ChangeType, valuesToChanges } from "../../interpreter"

export function applyToObject3D(
    input: Observable<Value<Primitive>>,
    object: Object3D,
    toObject: (value: Value<Primitive>) => Object3D,
    onError: (error: any) => void
): Subscription {
    const map = new Map<string, Object3D>()
    return input.pipe(valuesToChanges()).subscribe({
        next: (change) => {
            const key = change.index.join(",")
            if (change.type === ChangeType.SET) {
                const child = toObject(change.value)
                object.add(child)
                map.set(key, child)
            } else {
                const child = map.get(key)
                if (child != null) {
                    map.delete(key)
                    object.remove(child)
                }
            }
        },
        error: (error) => {
            onError(error)
        },
    })
}
