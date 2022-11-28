import { AbstractParsedOperation, HierarchicalParsedSteps, ParsedOperation, ParsedSteps } from "cgv"
import { Draft } from "immer"
import { Matrix4 } from "three"
import { useBaseStore } from "../../../../global"
import { AxisEnabled, TransformControl } from "./transform-control"

const axis3d: AxisEnabled = [true, true, true]
const axis2d: AxisEnabled = [true, false, true]

export function Point3Control<Type extends ParsedSteps["type"]>({
    substepValue,
    getSubstep,
    valueRef,
    matrix,
}: {
    matrix: Matrix4
    valueRef: { current: HierarchicalParsedSteps }
    getSubstep: (draft: Draft<ParsedSteps & { type: Type }> | (ParsedSteps & { type: Type })) => ParsedOperation
    substepValue: AbstractParsedOperation<unknown> & { type: Type }
}) {
    const store = useBaseStore()
    const x = substepValue.children[0].type === "raw" ? substepValue.children[0].value : 0
    const y = substepValue.children[1].type === "raw" ? substepValue.children[1].value : 0
    const z = substepValue.children[2].type === "raw" ? substepValue.children[2].value : 0
    return (
        <TransformControl
            value={[x, y, z]}
            axis={axis3d}
            matrix={matrix}
            mode="translate"
            set={(...xyz) =>
                store.getState().edit<Type>({
                    mode: "replace",
                    stepGenerator: (path, draft) => {
                        const subDraft = getSubstep == null ? draft : getSubstep(draft)
                        subDraft.children = xyz.map((value) => ({
                            type: "raw",
                            value,
                        }))
                    },
                    steps: valueRef.current,
                })
            }
        />
    )
}

export function Point2Control<Type extends ParsedSteps["type"]>({
    substepValue,
    getSubstep,
    valueRef,
    matrix,
}: {
    matrix: Matrix4
    valueRef: { current: HierarchicalParsedSteps }
    getSubstep: (draft: Draft<ParsedSteps & { type: Type }> | (ParsedSteps & { type: Type })) => ParsedOperation
    substepValue: AbstractParsedOperation<unknown> & { type: Type }
}) {
    const store = useBaseStore()

    const x = substepValue.children[0].type === "raw" ? substepValue.children[0].value : 0
    const z = substepValue.children[1].type === "raw" ? substepValue.children[1].value : 0

    return (
        <TransformControl
            value={[x, 0, z]}
            axis={axis2d}
            matrix={matrix}
            mode="translate"
            set={(x, y, z) =>
                store.getState().edit<Type>({
                    mode: "replace",
                    stepGenerator: (path, draft) => {
                        const subDraft = getSubstep == null ? draft : getSubstep(draft)
                        subDraft.children = [x, z].map((value) => ({
                            type: "raw",
                            value,
                        }))
                    },
                    steps: valueRef.current,
                })
            }
        />
    )
}
