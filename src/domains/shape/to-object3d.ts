import { OperatorFunction } from "rxjs"
import { Object3D } from "three"
import { toList, Value } from "../../interpreter"
import { Primitive } from "./primitive"

export function toObject3D<A>(
    valueToObject: (value: Value<Primitive, A>) => Object3D = (value) => value.raw.getObject()
): OperatorFunction<Value<Primitive, A>, Object3D> {
    return toList(
        () => new Object3D(),
        undefined,
        (object, value, index) => {
            const newChild = valueToObject(value)
            object.children.splice(index, 0, newChild)
            newChild.parent = object
        },
        (object, index) => {
            object.remove(object.children[index])
        }
    )
}
