import { AbstractParsedOperation, FullValue, HierarchicalInfo, serializeStepString } from "cgv"
import Tooltip from "rc-tooltip"
import { useBaseGlobal, useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"

export function GUIOperation({
    step,
    values,
}: {
    step: AbstractParsedOperation<HierarchicalInfo>
    values: Array<FullValue>
}) {
    const { operationGuiMap, operations } = useBaseGlobal()

    const OperationGUI = operationGuiMap[step.identifier]
    if (OperationGUI != null) {
        return <OperationGUI value={step} />
    }
    if (operations[step.identifier]?.defaultParameters != undefined) {
        return <GeneralGUIOperation value={step} values={values} />
    }
    return null
}

function GeneralGUIOperation({
    value,
    values,
}: {
    value: AbstractParsedOperation<HierarchicalInfo>
    values: Array<FullValue>
}) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mx-3 mb-3">
            {value.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom">
                    <div
                        className="flex-grow-1 p-3 pointer"
                        onClick={
                            (e) => store.getState().selectChildren(value, values, child)
                            //TODO: use selectRelation
                        }>
                        {
                            serializeStepString(child) //TODO: dont use serialize here
                        }
                    </div>
                    {
                        <Tooltip placement="left" overlay="Delete">
                            <div
                                onClick={() =>
                                    store.getState().replace<"operation">((draft) => {
                                        draft.children.splice(i, 1)
                                    }, value)
                                }
                                className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                                <DeleteIcon />
                            </div>
                        </Tooltip>
                    }
                </div>
            ))}
            <div
                className="btn btn-outline-success"
                onClick={() =>
                    store.getState().replace<"operation">((draft) => {
                        draft.children.push({ type: "this" })
                    }, value)
                }>
                Add Parameter
            </div>
        </div>
    )
}
