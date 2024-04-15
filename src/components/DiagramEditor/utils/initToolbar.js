import { default as MxGraph } from "mxgraph";
import { addToolbarItem, getStyleStringByObj } from "./";

const {
    mxEvent,
    mxRubberband,
    mxUtils,
    mxToolbar,
    mxKeyHandler,
    mxGeometry,
    mxCell,
} = MxGraph();

export default function initToolbar(graph, tbContainer) {
    // Creates new toolbar without event processing
    var toolbar = new mxToolbar(tbContainer);
    toolbar.enabled = false;

    // Enables new connections in the graph
    graph.setConnectable(true);

    // Allow multiple edges between two vertices
    graph.setMultigraph(false);

    // Stops editing on enter or escape keypress
    var keyHandler = new mxKeyHandler(graph);
    var rubberband = new mxRubberband(graph);

    var addVertex = function(icon, w, h, style, value = null) {
        var vertex = new mxCell(null, new mxGeometry(0, 0, w, h), style);
        if (value) {
            vertex.value = value;
        }
        vertex.setVertex(true);

        var img = addToolbarItem(graph, toolbar, vertex, icon);
        img.enabled = true;

    };

    var baseStyle = { ...graph.getStylesheet().getDefaultVertexStyle() };

    addVertex(
        "images/rectangle.gif",
        100,
        40,
    );
}
