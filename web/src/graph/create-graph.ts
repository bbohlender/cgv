import {
    getNounLabel,
    getStepLabel,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    ParsedSteps,
} from "cgv"
import { graphlib, layout } from "dagre"
import { Edge, Node, Position } from "react-flow-renderer"
import { childrenSelectable, OperationGUIMap } from "../gui"

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
        const content = getNounLabel(noun.name, descriptionName)
        addNode(noun.name, "noun", { content }, allNodes, graph)

        const connections = getConnections(noun, operationGuiMap, undefined)
        addConnections(connections, allEdges, graph)

        createGraphNode(allNodes, allEdges, graph, noun.step, descriptionName, operationGuiMap, undefined)
    }
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
    allNodes: Array<Node>,
    allEdges: Array<Edge>,
    graph: graphlib.Graph,
    step: HierarchicalParsedSteps,
    descriptionName: string,
    operationGuiMap: OperationGUIMap,
    nextNode: HierarchicalParsedSteps | undefined
): void {
    if (step.type === "sequential") {
        for (let i = 0; i < step.children.length; i++) {
            createGraphNode(
                allNodes,
                allEdges,
                graph,
                step.children[i],
                descriptionName,
                operationGuiMap,
                step.children[i + 1] ?? nextNode
            )
        }
        return
    }

    if (step.type === "parallel") {
        for (const child of step.children) {
            createGraphNode(allNodes, allEdges, graph, child, descriptionName, operationGuiMap, nextNode)
        }
        return
    }

    const connections = getConnections(step, operationGuiMap, nextNode)

    const content = getStepLabel(step, descriptionName)
    const hasParameters = connections.find(({ isMain }) => !isMain) != null
    addNode(step, "step", { content, hasParameters }, allNodes, graph)

    addConnections(connections, allEdges, graph)

    if (step.children == null) {
        return
    }

    const conditional = isConditional(step)

    for (let i = 0; i < step.children.length; i++) {
        if (!followChild(step, i, operationGuiMap)) {
            continue
        }
        createGraphNode(
            allNodes,
            allEdges,
            graph,
            step.children[i],
            descriptionName,
            operationGuiMap,
            conditional ? nextNode : undefined
        )
    }
}

type Connection = {
    source: HierarchicalParsedSteps | string
    target: HierarchicalParsedSteps
    label: string | undefined
    isMain: boolean
}

function addNode(
    value: string | HierarchicalParsedSteps,
    type: "step" | "noun",
    data: { content: string; hasParameters?: boolean },
    allNodes: Array<Node>,
    graph: graphlib.Graph
): void {
    const id = getNodeId(value)
    allNodes.push({
        data: { ...data, value },
        type,
        id,
        position: { x: 0, y: 0 },
        connectable: false,
        selectable: false,
        draggable: false,
    })

    graph.setNode(id, { width: nodeWidth + edgeSpace, height: nodeHeight + edgeSpace })
}

function addConnections(connections: Array<Connection>, allEdges: Array<Edge>, graph: graphlib.Graph): void {
    for (const { isMain, label, source, target } of connections) {
        const sourceId = getNodeId(source)
        const targetId = getNodeId(target)
        graph.setEdge(sourceId, targetId, {})
        allEdges.push({
            id: getEdgeId(sourceId, targetId),
            sourceHandle: isMain ? "main" : "parameter",
            source: sourceId,
            target: targetId,
            label,
            animated: true,
            style: isMain ? { stroke: "#88f", strokeWidth: 4 } : { stroke: "#999", strokeWidth: 2 },
        })
    }
}

function followChild(parent: HierarchicalParsedSteps, index: number, operationGuiMap: OperationGUIMap): boolean {
    switch (parent.type) {
        case "switch":
        case "if":
            return index > 0
        case "operation":
            return childrenSelectable(operationGuiMap, parent)
        default:
            return true
    }
}

/**
 * @returns children that should be displayed in the graph
 */
function getConnections(
    step: HierarchicalParsedSteps | HierarchicalParsedGrammarDefinition[number],
    operationGuiMap: OperationGUIMap,
    nextNode: HierarchicalParsedSteps | undefined
): Array<Connection> {
    if ("name" in step) {
        return resolveRealStep(step.step).map((realStep) => ({
            isMain: true,
            label: undefined,
            source: step.name,
            target: realStep,
        }))
    }
    const nextNodeConnections: Array<Connection> =
        nextNode == null
            ? []
            : resolveRealStep(nextNode).map((nextStep) => ({
                  isMain: true,
                  label: undefined,
                  source: step,
                  target: nextStep,
              }))
    switch (step.type) {
        case "random":
            return step.children.reduce<Array<Connection>>(
                (prev, child, i) =>
                    prev.concat(
                        resolveRealStep(child).map((child) => ({
                            source: step,
                            label: `${(step.probabilities[i] * 100).toFixed()}%`,
                            isMain: true,
                            target: child,
                        }))
                    ),
                []
            )
        case "if":
            return resolveRealStep(step.children[1])
                .map((child) => ({
                    source: step,
                    label: `then`,
                    isMain: true,
                    target: child,
                }))
                .concat(
                    resolveRealStep(step.children[2]).map((child) => ({
                        source: step,
                        label: `else`,
                        isMain: true,
                        target: child,
                    }))
                )
        case "switch":
            return step.children.slice(1).reduce<Array<Connection>>(
                (prev, child, i) =>
                    prev.concat(
                        resolveRealStep(child).map((child) => ({
                            source: step,
                            label: `case ${step.cases[i]}`,
                            isMain: true,
                            target: child,
                        }))
                    ),
                []
            )
        default: {
            const children =
                step.type !== "operation" || childrenSelectable(operationGuiMap, step) ? step.children : undefined
            return children != null
                ? nextNodeConnections.concat(
                      children.reduce<Array<Connection>>(
                          (prev, child) =>
                              prev.concat(
                                  resolveRealStep(child).map((child) => ({
                                      isMain: false,
                                      label: undefined,
                                      source: step,
                                      target: child,
                                  }))
                              ),
                          []
                      )
                  )
                : nextNodeConnections
        }
    }
}

function resolveRealStep(step: HierarchicalParsedSteps): Array<HierarchicalParsedSteps> {
    if (step.type === "parallel") {
        return step.children.reduce<Array<HierarchicalParsedSteps>>(
            (prev, child) => prev.concat(resolveRealStep(child)),
            []
        )
    }
    if (step.type === "sequential") {
        return resolveRealStep(step.children[0])
    }
    return [step]
}

function getEdgeId(sourceId: string, targetId: string): string {
    return `${sourceId}-${targetId}`
}

function getNodeId(step: string | HierarchicalParsedSteps): string {
    return typeof step === "string" ? `noun-${step}` : `step-${step.path.join(",")}`
}

function isConditional(step: HierarchicalParsedSteps): boolean {
    return step.type === "random" || step.type === "if" || step.type === "switch"
}
