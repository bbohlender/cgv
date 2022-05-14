import { getNounLabel, getStepLabel, HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps } from "cgv"
import { graphlib, layout } from "dagre"
import { Edge, Node, Position } from "react-flow-renderer"
import { OperationGUIMap } from "../gui"
import { EdgeInfo, getEdgeInfos } from "./node-types"

export function createGraph(
    allNodes: Array<Node>,
    allEdges: Array<Edge>,
    description: HierarchicalParsedGrammarDefinition,
    descriptionName: string,
    operationGuiMap: OperationGUIMap
): void {
    const graph = new graphlib.Graph()
    graph.setGraph({ rankdir: "LR" })
    for (const noun of description) {
        const id = `noun-${noun.name}`
        const content = getNounLabel(noun.name, descriptionName)
        allNodes.push({
            data: { noun, content },
            type: "noun",
            id,
            position: { x: 0, y: 0 },
            connectable: false,
            selectable: false,
            draggable: false,
        })
        graph.setNode(id, {
            width: nodeWidth + edgeSpace,
            height: nodeHeight + edgeSpace,
        })
        createGraphNode(
            0,
            allNodes,
            allEdges,
            graph,
            noun.step,
            descriptionName,
            [
                {
                    index: 0,
                    isMain: true,
                    label: undefined,
                    source: noun.name,
                    target: noun.step,
                },
            ],
            operationGuiMap
        )
    }
    console.log(allNodes, allEdges)
    layout(graph)
    for (const node of allNodes) {
        const { x, y, width, height } = graph.node(node.id)
        node.targetPosition = Position.Left
        node.sourcePosition = Position.Right
        node.position.x = x - width / 2
        node.position.y = y - height / 2
        //node.width = width
        //node.height = height
    }
}

const edgeSpace = 30
export const nodeWidth = 140
export const nodeHeight = 50

function createGraphNode(
    indexOffset: number,
    allNodes: Array<Node>,
    allEdges: Array<Edge>,
    graph: graphlib.Graph,
    step: HierarchicalParsedSteps,
    descriptionName: string,
    incommingEdges: Array<EdgeInfo>,
    operationGuiMap: OperationGUIMap
): Array<EdgeInfo> {
    if (step.type === "sequential") {
        for (let i = 0; i < step.children.length; i++) {
            const sequentialStep = step.children[i]
            if (i > 0) {
                for (const outgoingEdge of incommingEdges) {
                    
                }
            }
            incommingEdges = createGraphNode(
                i > 0 ? 1 : 0,
                allNodes,
                allEdges,
                graph,
                sequentialStep,
                descriptionName,
                incommingEdges,
                operationGuiMap
            )
        }
        return incommingEdges
    }

    if (step.type === "parallel") {
        return step.children.reduce<Array<EdgeInfo>>(
            (result, child) =>
                result.concat(
                    createGraphNode(
                        0,
                        allNodes,
                        allEdges,
                        graph,
                        child,
                        descriptionName,
                        incommingEdges,
                        operationGuiMap
                    )
                ),
            []
        )
    }

    const id = step.path.join(",")

    for (const { index, isMain, label, source } of incommingEdges) {
        const parentId = typeof source === "string" ? `noun-${source}` : source.path.join(",")
        graph.setEdge(parentId, id, {})
        allEdges.push({
            id: getEdgeId(parentId, id),
            sourceHandle: (index! + indexOffset).toString(),
            source: parentId,
            target: id,
            label,
            animated: true,
            style: isMain ? { stroke: "#88f", strokeWidth: 4 } : { stroke: "#999", strokeWidth: 2 },
        })
    }

    const content = getStepLabel(step, descriptionName)
    const outEdges = getEdgeInfos(step, operationGuiMap)

    allNodes.push({
        data: { step, content, connections: outEdges },
        type: "step",
        id,
        position: { x: 0, y: 0 },
        connectable: false,
        selectable: false,
        draggable: false,
    })

    graph.setNode(id, { width: nodeWidth + edgeSpace, height: nodeHeight + edgeSpace })

    return outEdges
        .reduce<Array<EdgeInfo>>(
            (result, info) =>
                result.concat(
                    createGraphNode(
                        0,
                        allNodes,
                        allEdges,
                        graph,
                        info.target,
                        descriptionName,
                        incommingEdges,
                        operationGuiMap
                    )
                ),
            []
        )
        .filter(({ isMain }) => isMain)
}

function getEdgeId(sourceId: string, targetId: string): string {
    return `${sourceId}-${targetId}`
}
