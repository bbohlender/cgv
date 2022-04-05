import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../../global"
import { TransformControl } from "./transform-control"

export function PointControl({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const store = useBaseStore()
    const x = value.children[0].type === "raw" ? value.children[0].value : undefined
    const y = value.children[1].type === "raw" ? value.children[1].value : undefined
    const z = value.children[2].type === "raw" ? value.children[2].value : undefined
    return (
        <TransformControl
            position={[x, y, z]}
            set={(...xyz) =>
                store.getState().replace(value, {
                    ...value,
                    children: xyz.map((value) => ({
                        type: "raw",
                        value,
                    })),
                })
            }
        />
    )
}
