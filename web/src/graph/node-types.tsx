import {
    getNounLabel,
    getStepLabel,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    localizeStepsSerializer,
    ParsedSteps,
    SelectedSteps,
    serializeStepString,
} from "cgv"
import { Handle, NodeProps, NodeTypes, Position } from "react-flow-renderer"
import { BaseState } from "../base-state"
import { useBaseStoreState } from "../global"
import { childrenSelectable, OperationGUIMap } from "../gui"
import { nodeHeight, nodeWidth } from "./create-graph"

export type EdgeInfo = {
    source: HierarchicalParsedSteps | string
    target: HierarchicalParsedSteps
    label: string | undefined
    isMain: boolean
    index: number | undefined
}

function getEdgeInfo(
    source: HierarchicalParsedSteps | string,
    target: HierarchicalParsedSteps,
    targetIndex: number
): EdgeInfo {
    if (typeof source === "string") {
        return {
            source,
            isMain: true,
            index: 0,
            label: undefined,
            target,
        }
    }
    switch (source.type) {
        case "random":
            return {
                source,
                label: `${(source.probabilities[targetIndex!] * 100).toFixed()}%`,
                isMain: true,
                index: targetIndex!,
                target,
            }
        case "if":
            if (targetIndex == 0) {
                throw new Error(`no connection info for if condition`)
            }
            return {
                source,
                label: targetIndex === 1 ? "then" : "else",
                isMain: true,
                index: targetIndex! - 1,
                target,
            }
        case "switch":
            if (targetIndex == 0) {
                throw new Error(`no connection info for switch condition`)
            }
            return {
                source,
                label: `case ${source.cases[targetIndex! - 1]}`,
                isMain: true,
                index: targetIndex!,
                target,
            }
        default:
            return {
                source,
                label: undefined,
                isMain: false,
                index: targetIndex,
                target,
            }
    }
}

export function getEdgeInfos(step: HierarchicalParsedSteps, operationGuiMap: OperationGUIMap): Array<EdgeInfo> {
    switch (step.type) {
        case "switch":
        case "if":
            return step.children.slice(1).map((child, i) => getEdgeInfo(step, child, i + 1))
        default:
            return childrenSelectable(operationGuiMap, step)
                ? step.children?.map((child, i) => getEdgeInfo(step, child, i)) ?? []
                : []
    }
}

const paddingValue = 16
const fontSize = 24

export const nodeTypes: NodeTypes = {
    step: StepNodeType,
    noun: NounNodeType,
}

export function StepNodeType({
    data: { step, content, connections },
}: NodeProps<{
    step: HierarchicalParsedSteps
    content: string
    connections: Array<any>
}>) {
    const cssClassName = useBaseStoreState((state) => computeCssClassName(step, state))
    return (
        <div
            style={{ width: nodeWidth, height: nodeHeight, overflow: "hidden" }}
            className={`${cssClassName} align-items-center justify-content-center p-2 text-light position-relative border rounded d-flex flex-row align-items-center`}>
            <Handle
                type="target"
                style={{ position: "absolute", top: paddingValue + fontSize / 2 }}
                position={Position.Left}
            />

            <span>{content}</span>

            {connections.map((_, i) => (
                <Handle
                    style={{
                        position: "absolute",
                        bottom: (connections.length - i - 1) * paddingValue,
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
    data: { content, noun },
}: NodeProps<{
    width: number
    height: number
    content: string
    noun: HierarchicalParsedGrammarDefinition[number]
}>) {
    const cssClassName = useBaseStoreState((state) => computeCssClassName(noun.name, state))
    return (
        <div
            style={{ padding: paddingValue, width: nodeWidth, height: nodeHeight, overflow: "hidden" }}
            className={`${cssClassName} align-items-center justify-content-center text-light position-relative border rounded scroll d-flex flex-row align-items-center`}>
            <span style={{ fontSize }}>{content}</span>
            <Handle type="source" id="0" position={Position.Right} />
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
