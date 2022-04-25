import { getSelectedStepsJoinedPath, SelectedSteps } from "cgv"
import { useBaseStore } from "../../../../global"
import { MultiplePointControl } from "./multiple-points"
import { Point2Control, Point3Control } from "./point"

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
                <OperationControl key={getSelectedStepsJoinedPath(selections.steps)} value={selections.steps} />
            ))}
        </>
    )
}

function OperationControl({ value }: { value: SelectedSteps }) {
    if (typeof value == "string" || value.type != "operation") {
        return null
    }
    switch (value.identifier) {
        case "point3":
            return <Point3Control getSubstep={(draft) => draft} value={value} />
        case "point2":
            return <Point2Control getSubstep={(draft) => draft} value={value} />
        case "face":
        case "line":
            return <MultiplePointControl value={value} />
        default:
            return null
    }
}
