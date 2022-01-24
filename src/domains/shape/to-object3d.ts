import { map, mergeMap, Observable, of, OperatorFunction, scan } from "rxjs"
import { Object3D } from "three"
import { getIndexKey, getMatrixEntryIndexKey, MatrixEntry, switchGroupMap } from "../.."

function setObject(
    object: Object3D | undefined,
    index: Array<number>,
    value: Object3D | undefined
): Object3D | undefined {
    if (index.length <= 0) {
        return value
    }

    if (object === undefined) {
        object = new Object3D()
    }

    const oldChild = object.children[index[0]]
    if (oldChild != null) {
        oldChild.parent = null
    }

    const newChild = setObject(object.children[index[0]], index.slice(1), value) ?? new Object3D()
    if (newChild.parent !== null) {
        newChild.parent.remove(newChild)
    }
    newChild.parent = object
    object.children[index[0]] = newChild

    if (value === undefined) {
        //clear empty end of matrix
        let endIndex = object.children.length
        while (
            endIndex > 0 &&
            (object.children[endIndex - 1] == null || object.children[endIndex - 1].children.length == 0)
        ) {
            --endIndex
        }
        object.children.splice(endIndex, object.children.length - endIndex)
    } else {
        //fill previous with empty
        for (let i = index[0] - 1; i >= 0; i--) {
            if (object.children[i] == null) {
                object.children[i] = new Object3D()
            }
        }
    }
    return object
}

export function toObject3D<T>(
    getObject: (value: T) => Object3D
): OperatorFunction<Array<MatrixEntry<Observable<T | undefined>>>, Object3D | undefined> {
    return (observable) =>
        observable.pipe(
            mergeMap((changes) => of(...changes)), //like above okay here, since the inner observable directly completes
            switchGroupMap<MatrixEntry<Observable<T | undefined>>, Array<MatrixEntry<T | undefined>>, string>(
                (change) => change.value.pipe(map((value) => [{ index: change.index, value }])),
                getMatrixEntryIndexKey
            ),
            scan<Array<MatrixEntry<T | undefined>> | undefined, Object3D | undefined>(
                (prev, cur) =>
                    cur == null
                        ? undefined
                        : cur.reduce(
                              (p, entry) =>
                                  setObject(p, entry.index, entry.value == null ? undefined : getObject(entry.value)),
                              prev
                          ),
                undefined
            )
        )
}
