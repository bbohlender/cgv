import { OperatorFunction } from "rxjs"
import { Object3D } from "three"
import { Instance } from "."
import { toList, Value } from "../../interpreter"

export function toObject3D(): OperatorFunction<Value<Instance>, Object3D> {
    return toList(
        () => new Object3D(),
        undefined,
        (object, value, index) => {
            const newChild = value.raw.primitive.getObject()
            object.children.splice(index, 0, newChild)
            newChild.parent = object
        },
        (object, index) => {
            object.remove(object.children[index])
        }
    )
}
