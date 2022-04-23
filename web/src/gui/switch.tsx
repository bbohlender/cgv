import { AbstractParsedSwitch, FullIndex, HierarchicalInfo, serializeStepString } from "cgv"
import { useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"
import { BlurInput } from "./blur-input"
import { StartLabel } from "./label"
import { stringToConstant } from "./util"

export function GUISwitchStep({
    value,
    indices,
}: {
    value: AbstractParsedSwitch<HierarchicalInfo>
    indices: Array<FullIndex>
}) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mb-3 mx-3">
            <StartLabel
                onClick={
                    (e) => store.getState().selectChildren(value, indices, value.children[0])
                }
                value="Condition"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(value.children[0])}</div>
            </StartLabel>
            {value.children.slice(1).map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom mb-3">
                    <BlurInput
                        className="form-control form-control-sm"
                        type="text"
                        value={value.cases[i]}
                        onBlur={(e) =>
                            store.getState().replace<"switch">((draft) => {
                                draft.cases[i] = stringToConstant(e.target.value)
                            }, value)
                        }
                    />
                    <div
                        className="flex-grow-1 ms-2 p-3 pointer"
                        onClick={
                            (e) => store.getState().selectChildren(value, indices, child)
                        }>
                        {
                            serializeStepString(child) //TODO: dont use serialize here
                        }
                    </div>
                    <div
                        onClick={() => {
                            store.getState().replace<"switch">((draft) => {
                                draft.children.splice(i, 1)
                                draft.cases.splice(i, 1)
                            }, value)
                        }}
                        className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div
                onClick={() =>
                    store.getState().replace<"switch">((draft) => {
                        draft.children.push({ type: "this" })
                        draft.cases.push(0)
                    }, value)
                }
                className="btn btn-outline-success">
                Add Case
            </div>
        </div>
    )
}
