import * as net from "net";

console.log("Logs from your program will appear here!");

// $ curl -v http://localhost:4221/echo/abc
// Your server must respond with a 200 response that contains the following parts:

// Content-Type header set to text/plain.
// Content-Length header set to the length of the given string.
// Response body set to the given string.

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
    const ok = "HTTP/1.1 200 OK\r\n\r\n";
    const err = "HTTP/1.1 404 Not Found\r\n\r\n";

    const val = parser(data.toString());
    console.log(val);

    if (val.path[0] === "echo") {
      const param = val.path[1];
      socket.write(
        `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${param.length}\r\n\r\n${param}`,
      );
    } else if (val.path.length > 0) {
      socket.write(err);
    } else {
      socket.write(ok);
    }

    socket.end();
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
