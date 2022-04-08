import { HierarchicalParsedSteps } from "cgv"
import { useBaseStore } from "../../../../global"
import { MultiplePointsControl } from "./multiple-points"
import { PointControl } from "./point"

export function Control() {
    const store = useBaseStore()
    const selections = store((state) =>
        state.type === "gui" && state.requested == null ? state.selections : undefined
    )
    if (selections == null) {
        return null
    }
    return (
        <>
            {selections.map((selection) => (
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
