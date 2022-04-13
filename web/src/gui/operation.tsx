import { AbstractParsedOperation, HierarchicalInfo, serializeStepString } from "cgv"
import { useBaseGlobal, UseBaseStore, useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"

export function GUIOperation({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const { operationGuiMap, operations } = useBaseGlobal()

    const OperationGUI = operationGuiMap[value.identifier]
    if (OperationGUI != null) {
        return <OperationGUI value={value} />
    }
    if (operations[value.identifier]?.defaultParameters != undefined) {
        return <GeneralGUIOperation value={value} />
    }
    return null
}

function GeneralGUIOperation({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mx-3 mb-3">
            {value.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom">
                    <div
                        className="flex-grow-1 p-3 pointer"
                        onClick={(e) => store.getState().select(child, undefined, e.shiftKey ? "toggle" : "replace")}>
                        {serializeStepString(child)}
                    </div>
                    {
                        <div
                            onClick={() =>
                                store.getState().replace<"operation">((draft) => {
                                    draft.children.splice(i, 1)
                                })
                            }
                            className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                            <DeleteIcon />
                        </div>
                    }
                </div>
            ))}
            <div
                className="btn btn-outline-success"
                onClick={() =>
                    store.getState().replace<"operation">((draft) => {
                        draft.children.push({ type: "this" })
                    })
                }>
                Add Parameter
            </div>
        </div>
    )
}
