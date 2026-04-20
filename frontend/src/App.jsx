import { useState, useEffect } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("python3");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const templates = {
    python3: "print('Hello World')",
    nodejs: "console.log('Hello World');",
    cpp17: `#include <iostream>
using namespace std;

int main() {
  int n;
  cin >> n;
  cout << n;
  return 0;
}`,
    java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello World");
  }
}`
  };

  useEffect(() => {
    setCode(templates[language]);
  }, [language]);

  const runCode = async () => {
    setLoading(true);
    setOutput("Running...\n");

    try {
      const res = await axios.post(`${API_URL}/run`, {
        code,
        language,
        input
      });

      setOutput(res.data.output || "No output");
    } catch (err) {
      setOutput("Error running code");
    }

    setLoading(false);
  };

  return (
    <div className="app">
      <div className="header">
        <h2>Online Compiler</h2>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="python3">Python</option>
          <option value="nodejs">JavaScript</option>
          <option value="cpp17">C++</option>
          <option value="java">Java</option>
        </select>

        <button onClick={runCode}>
          {loading ? "Running..." : "Run ▶"}
        </button>
      </div>

      <div className="main">
        <div className="editor">
          <Editor
            height="60%"
            theme="vs-dark"
            language={
              language === "nodejs"
                ? "javascript"
                : language === "cpp17"
                ? "cpp"
                : language === "python3"
                ? "python"
                : "java"
            }
            value={code}
            onChange={(val) => setCode(val)}
          />
        </div>

        <div className="side">
          <div className="input-box">
            <h3>Input</h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input"
            />
          </div>

          <div className="output">
            <h3>Output</h3>
            <pre>{output}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;