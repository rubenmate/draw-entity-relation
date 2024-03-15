import "@maxgraph/core/css/common.css";
import "./style.css";
import {
	Client,
	Graph,
	InternalEvent,
	Perimeter,
	RubberBandHandler,
} from "@maxgraph/core";
import { registerCustomShapes } from "./custom-shapes";

const initializeGraph = (container: HTMLElement) => {
	// Disables the built-in context menu
	InternalEvent.disableContextMenu(container);

	const graph = new Graph(container);
	graph.setPanning(true); // Use mouse right button for panning
	new RubberBandHandler(graph); // Enables rubber band selection

	// shapes and styles
	registerCustomShapes();
	// create a dedicated style for "ellipse" to share properties
	graph.getStylesheet().putCellStyle("myEllipse", {
		perimeter: Perimeter.EllipsePerimeter,
		shape: "ellipse",
		verticalAlign: "top",
		verticalLabelPosition: "bottom",
	});

	// Gets the default parent for inserting new cells. This
	// is normally the first child of the root (i.e., layer 0).
	const parent = graph.getDefaultParent();

	// Adds cells to the model in a single step
	graph.batchUpdate(() => {
		// use the legacy insertVertex method
		const vertex01 = graph.insertVertex(
			parent,
			null,
			"a regular rectangle",
			10,
			10,
			100,
			100,
		);

		// You can edit the label with setValue
		vertex01.setValue("Test");

		const vertex02 = graph.insertVertex(
			parent,
			null,
			"a regular ellipse",
			350,
			90,
			50,
			50,
			{
				baseStyleNames: ["myEllipse"],
				fillColor: "orange",
			},
		);

		// use the legacy insertEdge method
		graph.insertEdge(
			parent,
			null,
			"an orthogonal style edge",
			vertex01,
			vertex02,
			{
				edgeStyle: "orthogonalEdgeStyle",
				rounded: true,
			},
		);

		// insert vertex using custom shapes using the new insertVertex method
		const vertex11 = graph.insertVertex({
			parent,
			value: "a custom rectangle",
			position: [20, 200],
			size: [100, 100],
			style: { shape: "customRectangle" },
		});

		// use the new insertVertex method using position and size parameters
		const vertex12 = graph.insertVertex({
			parent,
			value: "a custom ellipse",
			x: 150,
			y: 350,
			width: 70,
			height: 70,
			style: {
				baseStyleNames: ["myEllipse"],
				shape: "customEllipse",
			},
		});

		// use the new insertEdge method
		graph.insertEdge({
			parent,
			value: "another edge",
			source: vertex11,
			target: vertex12,
			style: { endArrow: "block" },
		});
	});

	// Add a button to the HTML structure
	const addButton = document.createElement("button");
	addButton.textContent = "Add Vertex";
	container.appendChild(addButton);

	// Add event listener to the button to add a vertex node
	addButton.addEventListener("click", () => {
		// Add a new vertex node to the graph
		const newVertex = graph.insertVertex(
			parent,
			null,
			"New Vertex",
			200, // X coordinate
			200, // Y coordinate
			100, // Width
			50, // Height
		);
	});
};

// display the maxGraph version in the footer
const footer = <HTMLElement>document.querySelector("footer");
footer.innerText = `Built with maxGraph ${Client.VERSION}`;

// Creates the graph inside the given container
initializeGraph(<HTMLElement>document.querySelector("#graph-container"));
