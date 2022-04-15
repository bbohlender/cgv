import { HierarchicalParsedSteps, SelectionsList } from "cgv"
import { useBaseStore } from "../../../../global"
import { MultiplePointsControl } from "./multiple-points"
import { PointControl } from "./point"

export function Control() {
    const store = useBaseStore()
    const selectionsList = store((state) =>
        state.type === "gui" && state.requested == null ? state.selectionsList : undefined
    )
    if (selectionsList == null) {
        return null
    }
    return (
        <>
            {selectionsList.map((selections) => (
                <OperationControl value={selections.steps} />
            ))}
        </>
    )
}

function OperationControl({ value }: { value: HierarchicalParsedSteps }) {
    if (value.type != "operation") {
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
