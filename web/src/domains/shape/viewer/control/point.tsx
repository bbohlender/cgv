import { AbstractParsedOperation, HierarchicalInfo, ParsedOperation, ParsedSteps, SelectionsList } from "cgv"
import { Draft } from "immer"
import { useBaseStore } from "../../../../global"
import { Transform2Control, Transform3Control } from "./transform-control"

export function Point3Control<Type extends ParsedSteps["type"]>({
    value,
    getSubstep,
}: {
    getSubstep?: (draft: Draft<ParsedSteps & { type: Type }>) => Draft<ParsedSteps>
    value: AbstractParsedOperation<HierarchicalInfo>
}) {
    const store = useBaseStore()
    const x = value.children[0].type === "raw" ? value.children[0].value : undefined
    const y = value.children[1].type === "raw" ? value.children[1].value : undefined
    const z = value.children[2].type === "raw" ? value.children[2].value : undefined
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
                })
            }
        />
    )
}
export function Point2Control<Type extends ParsedSteps["type"]>({
    value,
    getSubstep,
}: {
    getSubstep?: (draft: Draft<ParsedSteps & { type: Type }>) => Draft<ParsedSteps>
    value: AbstractParsedOperation<HierarchicalInfo>
}) {
    const store = useBaseStore()
    const x = value.children[0].type === "raw" ? value.children[0].value : undefined
    const z = value.children[1].type === "raw" ? value.children[1].value : undefined
    return (
        <Transform2Control
            position={[x, z]}
            set={(...xyz) =>
                store.getState().replace<Type>((draft) => {
                    const subDraft = getSubstep == null ? draft : getSubstep(draft)
                    subDraft.children = xyz.map((value) => ({
                        type: "raw",
                        value,
                    }))
                })
            }
        />
    )
}
