import { AbstractParsedOperation, HierarchicalInfo, assureType, HierarchicalParsedSteps } from "cgv"
import { useCallback } from "react"
import { Matrix4 } from "three"
import { Point2Control, Point3Control } from "./point"

export function MultiplePointControl({
    value,
    valueRef,
    matrix,
}: {
    matrix: Matrix4
    valueRef: { current: HierarchicalParsedSteps }
    value: AbstractParsedOperation<HierarchicalInfo>
}) {
    return (
        <>
            {value.children.map(
                (child, i) =>
                    child.type === "operation" && (
                        <SinglePointControl matrix={matrix} valueRef={valueRef} child={child} key={i} index={i} />
                    )
            )}
        </>
    )
}

function SinglePointControl({
    index,
    child,
    valueRef,
    matrix,
}: {
    matrix: Matrix4
    valueRef: { current: HierarchicalParsedSteps }
    index: number
    child: AbstractParsedOperation<HierarchicalInfo>
}) {
    const getSubstep = useCallback(
        (draft: AbstractParsedOperation<unknown>) => assureType("operation", draft.children[index]),
        [index]
    )
    return child.identifier === "point3" ? (
        <Point3Control<"operation"> matrix={matrix} valueRef={valueRef} getSubstep={getSubstep} substepValue={child} />
    ) : (
        <Point2Control<"operation"> matrix={matrix} valueRef={valueRef} getSubstep={getSubstep} substepValue={child} />
    )
}
