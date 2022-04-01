import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { BlurInput } from "../../../gui/blur-input"
import { useBaseStore } from "../../../global"

export const GUIPointStep = GUI3ValueOperationStep.bind(null, "point", 0, "mb-3 d-flex flex-row mx-3")

export function GUI3ValueOperationStep(
    identifier: string,
    defaultValue: number,
    className: string,
    { value }: { value: AbstractParsedOperation<HierarchicalInfo> }
) {
    const x = value.children[0].type === "raw" ? value.children[0].value : undefined
    const y = value.children[1].type === "raw" ? value.children[1].value : undefined
    const z = value.children[2].type === "raw" ? value.children[2].value : undefined
    const store = useBaseStore()

    const update = (...xyz: [number, number, number]) =>
        store.getState().change(value, {
            type: "operation",
            identifier,
            children: xyz.map((value) => ({
                type: "raw",
                value,
            })),
        })
    return (
        <div className={className}>
            <BlurInput
                value={x ?? defaultValue}
                type="number"
                className="flex-grow-1 me-2 flex-basis-0 form-control form-control-sm"
                onBlur={(e) => update(e.target.valueAsNumber, y, z)}
            />
            <BlurInput
                value={y ?? defaultValue}
                type="number"
                className="flex-grow-1 me-2 flex-basis-0 form-control form-control-sm"
                onBlur={(e) => update(x, e.target.valueAsNumber, z)}
            />
            <BlurInput
                value={z ?? defaultValue}
                type="number"
                className="flex-grow-1 flex-basis-0 form-control form-control-sm"
                onBlur={(e) => update(x, y, e.target.valueAsNumber)}
            />
        </div>
    )
}
