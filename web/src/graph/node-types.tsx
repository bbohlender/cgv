import { HierarchicalParsedSteps, SelectedSteps } from "cgv"
import { Handle, NodeProps, NodeTypes, Position } from "react-flow-renderer"
import { BaseState } from "../base-state"
import { useBaseStoreState } from "../global"
import { childrenSelectable, OperationGUIMap } from "../gui"
import { nodeHeight, nodeWidth } from "./create-graph"

const paddingValue = 16
const fontSize = 24

export const nodeTypes: NodeTypes = {
    step: StepNodeType,
    noun: NounNodeType,
}

export function StepNodeType({
    data: { value, content, hasParameters },
}: NodeProps<{
    value: HierarchicalParsedSteps
    content: string
    hasParameters: boolean
}>) {
    const cssClassName = useBaseStoreState((state) => computeCssClassName(value, state))
    return (
        <div
            style={{ width: nodeWidth, height: nodeHeight, overflow: "hidden" }}
            className={`${cssClassName} align-items-center justify-content-center p-2 text-light position-relative border rounded d-flex flex-row align-items-center`}>
            <Handle type="target" position={Position.Left} />

            <span>{content}</span>

            <Handle type="source" id="main" position={Position.Right} />

            {hasParameters && <Handle type="source" id="parameter" position={Position.Bottom} />}
        </div>
    )
}

export function NounNodeType({
    data: { content, value },
}: NodeProps<{
    content: string
    value: string
}>) {
    const cssClassName = useBaseStoreState((state) => computeCssClassName(value, state))
    return (
        <div
            style={{ padding: paddingValue, width: nodeWidth, height: nodeHeight, overflow: "hidden" }}
            className={`${cssClassName} align-items-center justify-content-center text-light position-relative border rounded scroll d-flex flex-row align-items-center`}>
            <span style={{ fontSize }}>{content}</span>
            <Handle type="source" position={Position.Right} />
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
