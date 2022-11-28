import { AbstractParsedIf, FullValue, HierarchicalInfo, serializeStepString } from "cgv"
import Tooltip from "rc-tooltip"
import { useBaseStore } from "../global"
import { ArrowLeftRightIcon } from "../icons/arrow-left-right"
import { StartLabel } from "./label"

export function GUIIfStep({ step, values }: { step: AbstractParsedIf<HierarchicalInfo>; values: Array<FullValue> }) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mb-3 mx-3">
            <StartLabel
                onClick={(e) => store.getState().selectChildren(step, values, step.children[0])}
                value="Condition"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(step.children[0])}</div>
            </StartLabel>

            <StartLabel
                onClick={(e) => store.getState().selectChildren(step, values, step.children[1])}
                value="Then"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(step.children[1])}</div>

                <Tooltip placement="left" overlay="Replace with this">
                    <button
                        onClick={() =>
                            store.getState().edit({ mode: "replace", stepGenerator: () => step.children[1], steps: step })
                        }
                        className="btn btn-sm btn-outline-primary">
                        <ArrowLeftRightIcon />
                    </button>
                </Tooltip>
            </StartLabel>

            <StartLabel
                onClick={(e) => store.getState().selectChildren(step, values, step.children[2])}
                value="Else"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(step.children[2])}</div>

                <Tooltip placement="left" overlay="Replace with this">
                    <button
                        onClick={() =>
                            store.getState().edit({
                                mode: "replace",
                                stepGenerator: () => step.children[2],
                                steps: step,
                            })
                        }
                        className="btn btn-sm btn-outline-primary">
                        <ArrowLeftRightIcon />
                    </button>
                </Tooltip>
            </StartLabel>
        </div>
    )
}
