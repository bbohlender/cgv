import {
    getNounLabel,
    getStepLabel,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    SelectedSteps,
} from "cgv"
import { Handle, NodeProps, NodeTypes, Position } from "react-flow-renderer"
import { BaseState } from "../base-state"
import { useBaseStore, useBaseStoreState } from "../global"
import { childrenSelectable, OperationGUIMap } from "../gui"

export const nodeTypes: NodeTypes = {
    step: StepNodeType,
    noun: NounNodeType,
}

export function StepNodeType({
    data: { step, descriptionName, operationGuiMap },
}: NodeProps<{ step: HierarchicalParsedSteps; descriptionName: string; operationGuiMap: OperationGUIMap }>) {
    const cssClassName = useBaseStoreState(state => computeCssClassName(step, state))
    const children = step.children != null && childrenSelectable(operationGuiMap, step) ? step.children : undefined
    return (
        <div
            style={{ paddingBottom: `${0.25 + 1 * (children?.length ?? 0)}rem` }}
            className={`${cssClassName} text-light position-relative px-3 pt-1 border rounded d-flex flex-row align-items-center`}>
            <Handle
                type="target"
                style={{ position: "absolute", top: "calc(0.25rem + 16px)" }}
                position={Position.Left}
            />

            {getStepLabel(step, descriptionName)}

            <Handle
                type="source"
                style={{ position: "absolute", top: "calc(0.25rem + 16px)" }}
                position={Position.Right}
                id="next"
            />
            {children?.map((_, i) => (
                <Handle
                    style={{
                        position: "absolute",
                        bottom: `${(children.length - i - 1) * 1 + 0.5}rem`,
                        top: "unset",
                    }}
                    type="source"
                    position={Position.Right}
                    id={i.toString()}
                />
            ))}
        </div>
    )
}

export function NounNodeType({
    data: { noun, descriptionName },
}: NodeProps<{ noun: HierarchicalParsedGrammarDefinition[number]; descriptionName: string }>) {
    const cssClassName = useBaseStoreState(state => computeCssClassName(noun.name, state))
    return (
        <div
            className={`${cssClassName} text-light position-relative px-3 py-1 border rounded d-flex flex-row align-items-center`}>
            {getNounLabel(noun.name, descriptionName)}

            <Handle type="source" id="next" position={Position.Right} />
        </div>
    )
}

function computeCssClassName(steps: SelectedSteps, state: BaseState): string | undefined {
    if (state.type != "gui") {
        return undefined
    }
    if (state.selectionsList.findIndex((selections) => selections.steps == steps) != -1) {
        return "bg-selected"
    }
    if (state.hovered != null && state.hovered.steps === steps) {
        return "bg-hovered"
    }
    return undefined
}
