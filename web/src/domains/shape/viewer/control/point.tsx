import { AbstractParsedOperation, HierarchicalParsedSteps, ParsedOperation, ParsedSteps } from "cgv"
import { Draft } from "immer"
import { useBaseStore } from "../../../../global"
import { Transform2Control, Transform3Control } from "./transform-control"

export function Point3Control<Type extends ParsedSteps["type"]>({
    substepValue,
    getSubstep,
    valueRef,
}: {
    valueRef: { current: HierarchicalParsedSteps }
    getSubstep: (draft: Draft<ParsedSteps & { type: Type }> | (ParsedSteps & { type: Type })) => ParsedOperation
    substepValue: AbstractParsedOperation<unknown> & { type: Type }
}) {
    const store = useBaseStore()
    const x = substepValue.children[0].type === "raw" ? substepValue.children[0].value : 0
    const y = substepValue.children[1].type === "raw" ? substepValue.children[1].value : 0
    const z = substepValue.children[2].type === "raw" ? substepValue.children[2].value : 0
    return (
        <Transform3Control
            position={[x, y, z]}
            set={(...xyz) =>
                store.getState().replace<Type>((draft) => {
                    const subDraft = getSubstep == null ? draft : getSubstep(draft)
                    subDraft.children = xyz.map((value) => ({
                        type: "raw",
                        value,
                    }))
                }, valueRef.current)
            }
        />
    )
}

export function Point2Control<Type extends ParsedSteps["type"]>({
    substepValue,
    getSubstep,
    valueRef,
}: {
    valueRef: { current: HierarchicalParsedSteps }
    getSubstep: (draft: Draft<ParsedSteps & { type: Type }> | (ParsedSteps & { type: Type })) => ParsedOperation
    substepValue: AbstractParsedOperation<unknown> & { type: Type }
}) {
    const store = useBaseStore()

    const x = substepValue.children[0].type === "raw" ? substepValue.children[0].value : 0
    const z = substepValue.children[1].type === "raw" ? substepValue.children[1].value : 0

    return (
        <Transform2Control
            position={[x, z]}
            set={(...xz) =>
                store.getState().replace<Type>((draft) => {
                    const subDraft = getSubstep == null ? draft : getSubstep(draft)
                    subDraft.children = xz.map((value) => ({
                        type: "raw",
                        value,
                    }))
                }, valueRef.current)
            }
        />
    )
}
