import { default as MxGraph } from "mxgraph";
import { addToolbarItem, getStyleStringByObj } from "./";

const {
    mxEvent,
    mxUtils,
    mxToolbar,
    mxClient,
    mxDivResizer,
    mxGeometry,
    mxCell,
    mxConstants,
} = MxGraph();

export default function initToolbar(graph, diagramRef, tbContainer) {
    // Creates new toolbar without event processing
    const toolbar = new mxToolbar(tbContainer);
    toolbar.enabled = false;

    // Workaround for Internet Explorer ignoring certain styles
    if (mxClient.IS_QUIRKS) {
        document.body.style.overflow = "hidden";
        new mxDivResizer(tbContainer);
    }

    // Enables new connections in the graph
    graph.setConnectable(true);

    // Allow multiple edges between two vertices
    graph.setMultigraph(false);

    const addVertex = (
        icon,
        w,
        h,
        style,
        value = null,
        addToDiagram = null,
    ) => {
        const vertex = new mxCell(null, new mxGeometry(0, 0, w, h), style);
        if (value) {
            vertex.value = value;
        }
        vertex.setVertex(true);

        const img = addToolbarItem(
            graph,
            toolbar,
            vertex,
            icon,
            diagramRef,
            addToDiagram,
        );
        img.enabled = true;

        graph.getSelectionModel().addListener(mxEvent.CHANGE, () => {
            const tmp = graph.isSelectionEmpty();
            mxUtils.setOpacity(img, tmp ? 100 : 20);
            img.enabled = tmp;
        });
    };

    const baseStyle = { ...graph.getStylesheet().getDefaultVertexStyle() };

    addVertex(
        "images/rectangle.gif",
        100,
        40,
        getStyleStringByObj({
            ...baseStyle,
        }),
        "Entidad",
        true,
    );
    addVertex(
        "images/text.gif",
        0,
        0,
        "text;html=1;align=center;verticalAlign=middle;resizable=0;points=[];",
        "Text",
    );
}
