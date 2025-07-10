import * as net from "net";

console.log("Logs from your program will appear here!");

// Request line
// GET                          // HTTP method
// /index.html                  // Request target
// HTTP/1.1                     // HTTP version
// \r\n                         // CRLF that marks the end of the request line
//
// // Headers
// Host: localhost:4221\r\n     // Header that specifies the server's host and port
// User-Agent: curl/7.64.1\r\n  // Header that describes the client's user agent
// Accept: */*\r\n              // Header that specifies which media types the client can accept
// \r\n                         // CRLF that marks the end of the headers

// Request body (empty)

type Request = {
  method: string;
  path: string[];
  protocol: string;
  headers: Map<string, string>;
};

const CRLF = "\r\n";

function helper(str: string): Request {
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
  };
}

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const req = data.toString();
    const ok = "HTTP/1.1 200 OK\r\n\r\n";
    const err = "HTTP/1.1 404 Not Found\r\n\r\n";

    const val = helper(data.toString());

    if (val.path.length > 0) {
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
