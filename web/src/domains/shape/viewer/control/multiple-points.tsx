import { AbstractParsedOperation, HierarchicalInfo, assureType } from "cgv"
import { Point2Control, Point3Control } from "./point"

export function MultiplePoint3Control({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" && (
                        <Point3Control<"operation">
                            key={i}
                            getSubstep={(draft) => assureType("operation", draft.children[i])}
                            value={value}
                        />
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
                        <Point2Control<"operation">
                            key={i}
                            getSubstep={(draft) => assureType("operation", draft.children[i])}
                            value={value}
                        />
                    )
            )}
        </>
    )
}