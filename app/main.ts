import * as net from "net";
import * as fs from "fs";
import * as path from "path";

console.log("Logs from your program will appear here!");

const args = process.argv;

const dirIdx = args.indexOf("--directory");
const hasDirFlag: boolean = dirIdx !== -1;
let dirFlag: null | string = null;

if (dirIdx + 1 >= args.length) {
  console.error("Error: --directory flag is required with a valid path");
  process.exit(1);
}

if (hasDirFlag) dirFlag = args[dirIdx + 1];

type Request = {
  method: string;
  path: string[];
  protocol: string;
  headers: Map<string, string>;
  body?: string;
};

const CRLF = "\r\n";

function parser(str: string): Request {
  const [_, body] = str.split(CRLF + CRLF);
  const [reqLine, ...rest] = _.split(CRLF);

  const [method, pathname, protocol] = reqLine.split(" ");

  const headers = new Map<string, string>();

  for (const line of rest) {
    const index = line.indexOf(":");

    if (index !== -1) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      headers.set(key, value);
    } else {
      headers.set("Request-Line", line);
    }
  }

  return {
    method,
    path: pathname.split("/").filter(Boolean),
    protocol,
    headers: headers,
    body,
  };
}

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const val = parser(data.toString());
    console.log(val);

    const base = val.path[0];
    const param = val.path[1];

    switch (base) {
      case undefined: {
        socket.write("HTTP/1.1 200 OK\r\n\r\n");

        break;
      }

      case "echo": {
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${param.length}\r\n\r\n${param}`,
        );

        break;
      }

      case "files": {
        if (val.method !== "GET") {
          socket.write("HTTP/1.1 405 Method Not Allowed\r\n\r\n");
          break;
        }

        if (!param) {
          socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
          break;
        }

        if (!dirFlag) {
          socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
          break;
        }

        const filePath = path.join(dirFlag, param);

        if (!filePath.startsWith(dirFlag)) {
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          break;
        }

        if (fs.existsSync(filePath)) {
          try {
            const fileContent = fs.readFileSync(filePath);
            console.log(filePath);
            console.log(fileContent);
            socket.write(
              `HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileContent.length}\r\n\r\n${fileContent.toString()}`,
            );
          } catch (err) {
            socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
          }
        } else {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }

        break;
      }

      case "user-agent": {
        const userAgent = val.headers.get("User-Agent");

        if (!userAgent) {
          throw new Error("failed to retrieve user agent");
        }
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}`,
        );

        break;
      }
      default: {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");

        break;
      }
    }

    socket.end();
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
