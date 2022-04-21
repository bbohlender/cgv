import { AbstractParsedOperation, HierarchicalInfo, ParsedOperation, ParsedSteps, SelectionsList } from "cgv"
import { Draft } from "immer"
import { useBaseStore } from "../../../../global"
import { Transform2Control, Transform3Control } from "./transform-control"

export function Point3Control<Type extends ParsedSteps["type"]>({
    value,
    getSubstep,
}: {
    getSubstep: (draft: Draft<ParsedSteps & { type: Type }> | (ParsedSteps & { type: Type })) => ParsedOperation
    value: ParsedSteps & { type: Type }
}) {
    const substepValue = getSubstep(value)
    const store = useBaseStore()
    const x = substepValue.children[0].type === "raw" ? substepValue.children[0].value : undefined
    const y = substepValue.children[1].type === "raw" ? substepValue.children[1].value : undefined
    const z = substepValue.children[2].type === "raw" ? substepValue.children[2].value : undefined
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
                }, value)
            }
        />
    )
}

export function Point2Control<Type extends ParsedSteps["type"]>({
    value,
    getSubstep,
}: {
    getSubstep: (draft: Draft<ParsedSteps & { type: Type }> | (ParsedSteps & { type: Type })) => ParsedOperation
    value: ParsedSteps & { type: Type }
}) {
    const substepValue = getSubstep(value)
    const store = useBaseStore()
    const x = substepValue.children[0].type === "raw" ? substepValue.children[0].value : undefined
    const z = substepValue.children[1].type === "raw" ? substepValue.children[1].value : undefined
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
                }, value)
            }
        />
    )
}
