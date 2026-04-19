import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let processes = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("run", ({ code, language }) => {
    let fileName = "";
    let cmd = "";
    let args = [];

    try {
      // 🧠 JS (CommonJS fix)
      if (language === "nodejs") {
        fileName = "code.cjs";
        fs.writeFileSync(fileName, code);
        cmd = "node";
        args = [fileName];
      }

      // 🧠 Python (UNBUFFERED FIX 🔥)
      else if (language === "python3") {
        fileName = "code.py";
        fs.writeFileSync(fileName, code);
        cmd = "python";
        args = ["-u", fileName]; // 🔥 CRITICAL FIX
      }

      // 🧠 Spawn with proper stdio
      const proc = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"]
      });

      processes[socket.id] = proc;

      // 🔥 LIVE OUTPUT
      proc.stdout.on("data", (data) => {
        const text = data.toString();
        console.log("STDOUT:", text);
        socket.emit("output", text);
      });

      proc.stderr.on("data", (data) => {
        const text = data.toString();
        console.log("STDERR:", text);
        socket.emit("output", text);
      });

      proc.on("close", (code) => {
        socket.emit("output", `\n[Process Ended with code ${code}]\n`);
        delete processes[socket.id];
      });

    } catch (err) {
      socket.emit("output", "Error starting process\n");
      console.error(err);
    }
  });

  // 🔥 INPUT HANDLER (FIXED)
  socket.on("input", (data) => {
    const proc = processes[socket.id];

    if (!proc) {
      socket.emit("output", "\n[No active process]\n");
      return;
    }

    console.log("INPUT:", data);

    try {
      proc.stdin.write(data + "\n"); // 👈 MUST HAVE NEWLINE
    } catch (err) {
      console.error("stdin error:", err);
      socket.emit("output", "\n[Input error]\n");
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    if (processes[socket.id]) {
      processes[socket.id].kill();
      delete processes[socket.id];
    }
  });
});

server.listen(5000, () => {
  console.log("🔥 WebSocket terminal running on http://localhost:5000");
});