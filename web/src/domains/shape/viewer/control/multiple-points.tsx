import { AbstractParsedOperation, HierarchicalInfo, assureType } from "cgv"
import { Point2Control, Point3Control } from "./point"

export function MultiplePointControl({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" &&
                    (child.identifier === "point3" ? (
                        <Point3Control<"operation">
                            key={i}
                            getSubstep={(draft) => assureType("operation", draft.children[i])}
                            value={value}
                        />
                    ) : (
                        <Point2Control<"operation">
                            key={i}
                            getSubstep={(draft) => assureType("operation", draft.children[i])}
                            value={value}
                        />
                    ))
            )}
        </>
    )
}
