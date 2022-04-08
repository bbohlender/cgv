import { getAtPath, getPathFromSelection, Selection, translatePath } from "cgv"
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
                <OperationControl selection={selection} />
            ))}
        </>
    )
}

function OperationControl({ selection }: { selection: Selection }) {
    const store = useBaseStore()
    const value = store((state) => {
        if (state.type != "gui" || state.requested != null) {
            return undefined
        }
        const translatedPath = translatePath(state.grammar, getPathFromSelection(selection))
        if (translatedPath == null) {
            return null
        }
        return getAtPath(translatedPath, selection.path.length - 1)
    })
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
