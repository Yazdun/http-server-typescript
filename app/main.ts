import * as net from "net";

console.log("Logs from your program will appear here!");

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
    console.log(base);
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
