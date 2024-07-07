import * as React from "react";
import "./styles.css";
import DiagramEditor from "./components/DiagramEditor/DiagramEditor";

export default function App() {
    return (
        <div className="App">
            <div className="container">
                <DiagramEditor />
            </div>
        </div>
    );
}
