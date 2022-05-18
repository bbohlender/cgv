import { AbstractParsedOperation, HierarchicalInfo, assureType, HierarchicalParsedSteps, ParsedSteps } from "cgv"
import { useCallback, useEffect } from "react"
import { Point2Control, Point3Control } from "./point"

export function MultiplePointControl({
    value,
    valueRef,
}: {
    valueRef: { current: HierarchicalParsedSteps }
    value: AbstractParsedOperation<HierarchicalInfo>
}) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" && (
                        <SinglePointControl valueRef={valueRef} child={child} key={i} index={i} />
                    )
            )}
        </>
    )
}

function SinglePointControl({
    index,
    child,
    valueRef,
}: {
    valueRef: { current: HierarchicalParsedSteps }
    index: number
    child: AbstractParsedOperation<HierarchicalInfo>
}) {
    const getSubstep = useCallback(
        (draft: AbstractParsedOperation<unknown>) => assureType("operation", draft.children[index]),
        [index]
    )
    return child.identifier === "point3" ? (
        <Point3Control<"operation"> valueRef={valueRef} getSubstep={getSubstep} substepValue={child} />
    ) : (
        <Point2Control<"operation"> valueRef={valueRef} getSubstep={getSubstep} substepValue={child} />
    )
}
