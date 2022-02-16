import { OperatorFunction, scan } from "rxjs"
import { Object3D } from "three"
import { Instance } from "."
import { changesToArrayChanges, ChangeType, InterpretionValue, Matrix, matrixToChanges } from "../.."

export function matrixObject3D(): OperatorFunction<Matrix<InterpretionValue<Instance>>, Object3D> {
    return (observable) =>
        observable.pipe(
            matrixToChanges(),
            changesToArrayChanges(),
            scan((object3d, changes) => {
                for (const change of changes) {
                    let removedChildren: Array<Object3D>
                    if (change.type === ChangeType.UNSET) {
                        removedChildren = object3d.children.splice(change.index, change.deleteAmount)
                    } else {
                        const newChild = change.value.value.primitive.getObject()
                        newChild.parent?.remove(newChild)
                        newChild.parent = object3d
                        removedChildren = object3d.children.splice(change.index, change.deleteAmount, newChild)
                    }
                    for (const child of removedChildren) {
                        child.parent = null
                    }
                }
                return object3d
            }, new Object3D())
        )
}
