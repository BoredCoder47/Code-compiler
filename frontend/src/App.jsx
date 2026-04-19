import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("python3");
  const [input, setInput] = useState("");

  const templates = {
    python3: "print('Hello World')",
    nodejs: "console.log('Hello World');"
  };

  useEffect(() => {
    setCode(templates[language]);

    socket.on("output", (data) => {
      setOutput((prev) => prev + data);
    });

    return () => socket.off("output");
  }, [language]);

  const runCode = () => {
    setOutput("");
    socket.emit("run", { code, language });
  };

  const handleInput = (e) => {
    if (e.key === "Enter") {
      socket.emit("input", input);
      setOutput((prev) => prev + input + "\n");
      setInput("");
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h2>Real Compiler</h2>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="python3">Python</option>
          <option value="nodejs">JavaScript</option>
        </select>

        <button onClick={runCode}>Run ▶</button>
      </div>

      <div className="main">
        <div className="editor">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language === "nodejs" ? "javascript" : "python"}
            value={code}
            onChange={(val) => setCode(val)}
          />
        </div>

        <div className="output">
          <h3>Terminal</h3>
          <pre>{output}</pre>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInput}
            placeholder="Type input and press Enter"
          />
        </div>
      </div>
    </div>
  );
}

export default App;