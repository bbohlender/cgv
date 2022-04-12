import { distinctUntilChanged, OperatorFunction } from "rxjs"
import { Object3D } from "three"
import { toList, Value } from "../.."
import { Primitive } from "."

export function toObject3D<A>(
    valueToObject: (value: Value<Primitive, A>) => Object3D = (value) => value.raw.getObject(),
    onObjectDeleted: (object: Object3D) => void
): OperatorFunction<Value<Primitive, A>, Object3D> {
    return (input) =>
        input.pipe(
            toList(
                () => new Object3D(),
                undefined,
                (object, value, index) => {
                    const newChild = valueToObject(value)
                    object.children.splice(index, 0, newChild)
                    newChild.parent = object
                },
                (object, index) => {
                    object.remove(object.children[index])
                    onObjectDeleted(object)
                }
            ),
            distinctUntilChanged()
        )
}
