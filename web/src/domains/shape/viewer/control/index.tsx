import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../../global"
import { MultiplePointsControl } from "./multiple-points"
import { PointControl } from "./point"

export function Control() {
    const store = useBaseStore()
    const selected = store((state) => (state.type === "gui" && state.requested == null ? state.selected : undefined))
    if (selected == null || typeof selected == "string" || selected.type != "operation") {
        return null
    }
    return <OperationControl value={selected} />
}

function OperationControl({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    switch (value.identifier) {
        case "point":
            return <PointControl value={value} />
        case "face":
        case "line":
            return <MultiplePointsControl value={value} />
        default:
            return null
    }
}
