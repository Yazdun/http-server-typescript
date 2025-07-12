import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import { Utils } from "@/utils/utils";

console.log("Logs from your program will appear here!");

const utils = new Utils();

const { dirFlag } = utils.initializer();

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const req = utils.parseBuffer(data.toString());

    const base = req.path[0];
    const param = req.path[1];

    switch (base) {
      case undefined: {
        socket.write(utils.generateResponse({ status: 200 }));
        break;
      }

      case "echo": {
        socket.write(
          utils.generateResponse({
            status: 200,
            contentType: "text/plain",
            contentLength: param.length,
            headers: req.headers,
            body: param,
          }),
        );
        break;
      }

      case "files": {
        if (!param) {
          socket.write(utils.generateResponse({ status: 400 }));
          break;
        }

        if (!dirFlag) {
          socket.write(utils.generateResponse({ status: 400 }));
          break;
        }

        switch (req.method) {
          case "GET": {
            const filePath = path.join(dirFlag, param);

            if (!filePath.startsWith(dirFlag)) {
              socket.write(utils.generateResponse({ status: 403 }));
              break;
            }

            if (fs.existsSync(filePath)) {
              try {
                const fileContent = fs.readFileSync(filePath);
                socket.write(
                  utils.generateResponse({
                    status: 200,
                    contentType: "application/octet-stream",
                    contentLength: fileContent.length,
                    body: fileContent.toString(),
                  }),
                );
              } catch (err) {
                socket.write(utils.generateResponse({ status: 500 }));
              }
            } else {
              socket.write(utils.generateResponse({ status: 404 }));
            }
            break;
          }

          case "POST": {
            if (!param) {
              socket.write(utils.generateResponse({ status: 400 }));
              break;
            }

            const content = req.body;

            const filePath = `${dirFlag}/${param}`;

            if (!content) {
              socket.write(utils.generateResponse({ status: 400 }));
              break;
            }

            fs.writeFileSync(filePath, content);

            socket.write(utils.generateResponse({ status: 201 }));
            break;
          }
          default: {
            socket.write(utils.generateResponse({ status: 405 }));
            break;
          }
        }

        break;
      }

      case "user-agent": {
        const userAgent = req.headers.get("User-Agent");

        if (!userAgent) throw new Error("failed to retrieve user agent");

        socket.write(
          utils.generateResponse({
            status: 200,
            contentType: "text/plain",
            contentLength: userAgent.length,
            body: userAgent,
          }),
        );

        break;
      }
      default: {
        socket.write(utils.generateResponse({ status: 404 }));
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
