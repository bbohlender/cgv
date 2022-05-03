import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps, ParsedGrammarDefinition, ParsedSteps } from "cgv"
import { graphlib, layout } from "dagre"
import { Edge, Node, Position } from "react-flow-renderer"

export function updateGraph(
    nodes: Array<Node>,
    edges: Array<Edge>,
    graph: graphlib.Graph,
    prevDescription: HierarchicalParsedGrammarDefinition | undefined,
    description: HierarchicalParsedGrammarDefinition
): void {
    const length = Math.max(prevDescription?.length ?? 0, description.length)
    for (let i = 0; i < length; i++) {
        //TODO: add node representing the noun
        const prevNoun = prevDescription != null ? prevDescription[i] : undefined
        const currentNoun = description[i]
        updateGraphNode(nodes, edges, graph, prevNoun?.step, currentNoun?.step, prevNoun?.name, currentNoun?.name)
    }
    layout(graph)
    for (const node of nodes) {
        const { x, y, width, height } = graph.node(node.id)
        node.targetPosition = Position.Left
        node.sourcePosition = Position.Right
        node.position.x = x - width / 2
        node.position.y = y - height / 2
        node.width = width
        node.height = height
    }
}

function updateGraphNode(
    nodes: Array<Node>,
    edges: Array<Edge>,
    graph: graphlib.Graph,
    previousStep: HierarchicalParsedSteps | undefined,
    currentStep: HierarchicalParsedSteps | undefined,
    prevParentId: string | undefined,
    currentParentId: string | undefined
): void {
    if (previousStep == currentStep) {
        return
    }
    const previousPath = previousStep?.path.join(",")
    const currentPath = currentStep?.path.join(",")

    if (previousPath != null && prevParentId != null) {
        //remove
        const id = edgeId(prevParentId, previousPath)
        graph.removeEdge(prevParentId, previousPath)
        graph.removeNode(previousPath)
        const edgeIndex = edges.findIndex((edge) => edge.id === id)
        if (edgeIndex !== -1) {
            edges.splice(edgeIndex, 1)
        }
        const nodeIndex = nodes.findIndex((node) => node.id === previousPath)
        if (nodeIndex !== -1) {
            nodes.splice(nodeIndex, 1)
        }
    }

    if (currentPath != null && currentParentId != null) {
        //add
        graph.setEdge(currentParentId, currentPath, {})
        edges.push({
            id: edgeId(currentParentId, currentPath),
            source: currentParentId,
            target: currentPath,
        })
        nodes.push({
            data: {
                label: currentStep!.type, //TODO
            },
            id: currentPath,
            position: { x: 0, y: 0 },
            connectable: false,
            selectable: false,
            draggable: false,
        })
        graph.setNode(currentPath, {
            width: 100,
            height: 20,
        })
    }

    const length = Math.max(currentStep?.children?.length ?? 0, previousStep?.children?.length ?? 0)
    for (let i = 0; i < length; i++) {
        const prevChild = previousStep?.children == null ? undefined : previousStep.children[i]
        const currentChild = currentStep?.children == null ? undefined : currentStep.children[i]

        updateGraphNode(nodes, edges, graph, prevChild, currentChild, previousPath, currentPath)
    }
}

function edgeId(sourceId: string, targetId: string): string {
    return `${sourceId}-${targetId}`
}
