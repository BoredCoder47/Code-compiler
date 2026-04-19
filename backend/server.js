import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 🔥 temp directory
const tempDir = "./temp";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

let processes = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("run", ({ code, language }) => {
    const id = Date.now();
    let fileName = "";
    let exeName = "";
    let proc;

    try {
      // 🟡 NODE JS
      if (language === "nodejs") {
        fileName = `${tempDir}/code_${id}.cjs`;
        fs.writeFileSync(fileName, code);

        proc = spawn("node", [fileName], {
          stdio: ["pipe", "pipe", "pipe"]
        });
      }

      // 🟢 PYTHON
      else if (language === "python3") {
        fileName = `${tempDir}/code_${id}.py`;
        fs.writeFileSync(fileName, code);

        proc = spawn("python", ["-u", fileName], {
          stdio: ["pipe", "pipe", "pipe"]
        });
      }

      // 🔵 C++
      else if (language === "cpp17") {
        fileName = `${tempDir}/code_${id}.cpp`;
        exeName = `${tempDir}/out_${id}.exe`;

        fs.writeFileSync(fileName, code);

        // Compile first
        const compile = spawn("g++", [fileName, "-o", exeName]);

        compile.stderr.on("data", (data) => {
          socket.emit("output", data.toString());
        });

        compile.on("close", (code) => {
          if (code !== 0) return;

          // Run after compile
          proc = spawn(exeName, [], {
            stdio: ["pipe", "pipe", "pipe"]
          });

          processes[socket.id] = proc;

          attachProcessHandlers(proc, socket, fileName, exeName);
        });

        return;
      }

      processes[socket.id] = proc;
      attachProcessHandlers(proc, socket, fileName);

    } catch (err) {
      console.error(err);
      socket.emit("output", "Error starting process\n");
    }
  });

  // 🔥 INPUT
  socket.on("input", (data) => {
    const proc = processes[socket.id];

    if (!proc) {
      socket.emit("output", "\n[No active process]\n");
      return;
    }

    try {
      proc.stdin.write(data + "\n");
    } catch (err) {
      console.error("stdin error:", err);
    }
  });

  socket.on("disconnect", () => {
    if (processes[socket.id]) {
      processes[socket.id].kill();
      delete processes[socket.id];
    }
  });
});

// 🔧 attach handlers
function attachProcessHandlers(proc, socket, fileName, exeName = null) {
  proc.stdout.on("data", (data) => {
    socket.emit("output", data.toString());
  });

  proc.stderr.on("data", (data) => {
    socket.emit("output", data.toString());
  });

  proc.on("close", () => {
    socket.emit("output", "\n[Process Ended]\n");

    // 🧹 cleanup files
    try {
      if (fileName && fs.existsSync(fileName)) fs.unlinkSync(fileName);
      if (exeName && fs.existsSync(exeName)) fs.unlinkSync(exeName);
    } catch (e) {
      console.log("Cleanup error:", e.message);
    }
  });
}

server.listen(5000, () => {
  console.log("🔥 Compiler running at http://localhost:5000");
});