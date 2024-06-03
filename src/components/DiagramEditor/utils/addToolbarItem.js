import { default as MxGraph } from "mxgraph";

const { mxEvent, mxUtils } = MxGraph();

export default function addToolbarItem(
    graph,
    toolbar,
    prototype,
    image,
    diagramRef,
    addToDiagram,
) {
    // Function that is executed when the image is dropped on
    // the graph. The cell argument points to the cell under
    // the mousepointer if there is one.
    const funct = (graph, evt, cell, x, y) => {
        graph.stopEditing(false);

        const vertex = graph.getModel().cloneCell(prototype);
        vertex.geometry.x = x;
        vertex.geometry.y = y;

        graph.addCell(vertex);
        graph.setSelectionCell(vertex);
        if (addToDiagram) {
            console.log(diagramRef.current);
            diagramRef.current.entities.push({
                idMx: vertex.id,
                name: vertex.value,
                position: { x: vertex.geometry.x, y: vertex.geometry.y },
                attributes: [],
            });
        }
    };

    // Creates the image which is used as the drag icon (preview)
    const img = toolbar.addMode(null, image, function (evt, cell) {
        const pt = this.graph.getPointForEvent(evt);
        funct(graph, evt, cell, pt.x, pt.y);
    });

    // Disables dragging if element is disabled. This is a workaround
    // for wrong event order in IE. Following is a dummy listener that
    // is invoked as the last listener in IE.
    mxEvent.addListener(img, "mousedown", (evt) => {
        // do nothing
    });

    // This listener is always called first before any other listener
    // in all browsers.
    mxEvent.addListener(img, "mousedown", (evt) => {
        if (!img.enabled) {
            mxEvent.consume(evt);
        }
    });

    mxUtils.makeDraggable(img, graph, funct);

    return img;
}
