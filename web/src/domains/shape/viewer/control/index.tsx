import { hasSelected, HierarchicalParsedSteps } from "cgv"
import { useBaseStore } from "../../../../global"
import { MultiplePointsControl } from "./multiple-points"
import { PointControl } from "./point"

export function Control() {
    const store = useBaseStore()
    const selectionsMap = store((state) =>
        state.type === "gui" && state.requested == null ? state.selectionsMap : undefined
    )
    if (selectionsMap == null) {
        return null
    }
    return (
        <>
            {Object.values(selectionsMap).filter(hasSelected).map((selection) => (
                <OperationControl value={selection.steps} />
            ))}
        </>
    )
}

function OperationControl({ value }: { value: HierarchicalParsedSteps }) {
    if (value == null || value.type != "operation") {
        return null
    }
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
