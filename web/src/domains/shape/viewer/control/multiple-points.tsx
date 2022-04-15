import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { PointControl } from "./point"

export function MultiplePointsControl({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" && (
                        <PointControl<"operation"> getSubstep={(draft) => draft.children[i]} selections={child} />
                    )
            )}
        </>
    )
}
