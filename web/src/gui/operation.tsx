import { AbstractParsedOperation, HierarchicalInfo, serializeStepString } from "cgv"
import { useGlobal, useStore } from "../global"
import { DeleteIcon } from "../icons/delete"

export function GUIOperation({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const { operationGuiMap, operations } = useGlobal()

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
    const store = useStore()
    return (
        <div className="d-flex flex-column mx-3 mb-3">
            {value.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom">
                    <div className="flex-grow-1 p-3 pointer" onClick={store.getState().select.bind(null, child)}>
                        {serializeStepString(child)}
                    </div>
                    <div
                        onClick={() => store.getState().remove(child)}
                        className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div
                className="btn btn-outline-success"
                onClick={store.getState().openStepDescriptorDialog.bind(null, "addParameter")}>
                Add Parameter
            </div>
        </div>
    )
}
