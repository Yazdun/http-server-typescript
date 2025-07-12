import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import { HttpHelper } from "@/utils/utils";

console.log("Logs from your program will appear here!");

const { dirFlag } = HttpHelper.initializer();

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const httpHelper = new HttpHelper(socket);

    const req = httpHelper.parseBuffer(data.toString());

    const base = req.path[0];
    const param = req.path[1];

    switch (base) {
      case undefined: {
        httpHelper.socket.write({ status: 200, headers: req.headers });
        break;
      }

      case "echo": {
        httpHelper.socket.write({
          status: 200,
          contentType: "text/plain",
          contentLength: param.length,
          headers: req.headers,
          body: param,
        });

        break;
      }

      case "files": {
        if (!param) {
          httpHelper.socket.write({ status: 400 });
          break;
        }

        if (!dirFlag) {
          httpHelper.socket.write({ status: 400 });
          break;
        }

        switch (req.method) {
          case "GET": {
            const filePath = path.join(dirFlag, param);

            if (!filePath.startsWith(dirFlag)) {
              httpHelper.socket.write({ status: 403 });
              break;
            }

            if (fs.existsSync(filePath)) {
              try {
                const fileContent = fs.readFileSync(filePath);
                httpHelper.socket.write({
                  status: 200,
                  contentType: "application/octet-stream",
                  contentLength: fileContent.length,
                  body: fileContent.toString(),
                });
              } catch (err) {
                httpHelper.socket.write({ status: 500 });
              }
            } else {
              httpHelper.socket.write({ status: 404 });
            }
            break;
          }

          case "POST": {
            if (!param) {
              httpHelper.socket.write({ status: 400 });
              break;
            }

            const content = req.body;

            const filePath = `${dirFlag}/${param}`;

            if (!content) {
              httpHelper.socket.write({ status: 400 });
              break;
            }

            fs.writeFileSync(filePath, content);

            httpHelper.socket.write({ status: 201 });

            break;
          }
          default: {
            httpHelper.socket.write({ status: 405 });
            break;
          }
        }

        break;
      }

      case "user-agent": {
        const userAgent = req.headers.get("User-Agent");

        if (!userAgent) throw new Error("failed to retrieve user agent");

        httpHelper.socket.write({
          status: 200,
          contentType: "text/plain",
          contentLength: userAgent.length,
          body: userAgent,
        });

        break;
      }
      default: {
        httpHelper.socket.write({ status: 404 });
        break;
      }
    }
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");
