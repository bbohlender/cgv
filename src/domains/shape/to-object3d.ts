import { OperatorFunction, scan } from "rxjs"
import { Object3D } from "three"
import { Instance } from "."
import { ArrayChange, changesToArrayChanges, ChangeType, InterpretionValue, Matrix, matrixToChanges } from "../.."

export function matrixObject3D(): OperatorFunction<Matrix<InterpretionValue<Instance>>, Object3D> {
    return (observable) =>
        observable.pipe(
            matrixToChanges(),
            changesToArrayChanges(),
            scan((object3d, changes) => {
                if (Array.isArray(changes)) {
                    for (const change of changes) {
                        applyChange(object3d, change)
                    }
                } else {
                    applyChange(object3d, changes)
                }
                return object3d
            }, new Object3D())
        )
}

function applyChange(object3d: Object3D, change: ArrayChange<InterpretionValue<Instance>>) {
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
