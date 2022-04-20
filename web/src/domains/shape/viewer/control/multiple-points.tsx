import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { Point2Control, Point3Control } from "./point"

export function MultiplePoint3Control({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" && (
                        <Point3Control<"operation"> getSubstep={(draft) => draft.children[i]} value={child} />
                    )
            )}
        </>
    )
}

export function MultiplePoint2Control({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" && (
                        <Point2Control<"operation"> getSubstep={(draft) => draft.children[i]} value={child} />
                    )
            )}
        </>
    )
}
