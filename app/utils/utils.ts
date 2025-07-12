import { gzipSync } from "node:zlib";

export type Request = {
  method: string;
  path: string[];
  protocol: string;
  headers: Map<string, string>;
  body?: string;
};

export type Initializer = {
  dirFlag: string | null;
};

export type HttpStatusCode = 200 | 201 | 400 | 403 | 404 | 405 | 500;

export type ContentType =
  | "text/plain"
  | "application/octet-stream"
  | "application/json"
  | "text/html";

export interface ResponseOptions {
  status: HttpStatusCode;
  contentType?: ContentType;
  contentLength?: number;
  body?: string;
  headers?: Map<string, string>;
}

const statusMessages: Record<HttpStatusCode, string> = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  500: "Internal Server Error",
};

const supportedEncodings = ["gzip"];

const CRLF = "\r\n";

export class Utils {
  initializer(): Initializer {
    const args = process.argv;
    const dirIdx = args.indexOf("--directory");
    const hasDirFlag: boolean = dirIdx !== -1;
    let dirFlag: null | string = null;

    if (dirIdx + 1 >= args.length) {
      console.error("Error: --directory flag is required with a valid path");
      process.exit(1);
    }

    if (hasDirFlag) dirFlag = args[dirIdx + 1];

    return {
      dirFlag,
    };
  }

  parseBuffer(str: string): Request {
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

  generateResponse(options: ResponseOptions): {
    headers: string;
    body: Uint8Array | string;
  } {
    const { status, contentType, contentLength, body = "", headers } = options;
    let _headers = `HTTP/1.1 ${status} ${statusMessages[status]}${CRLF}`;
    let _body: Uint8Array | string = body;
    let shouldCompress = false;

    if (contentType) _headers += `Content-Type: ${contentType}${CRLF}`;

    if (headers) {
      Array.from(headers, ([header, value]) => ({ header, value })).forEach(
        (item) => {
          switch (item.header) {
            case "Accept-Encoding": {
              const encodings = item.value
                .split(",")
                .filter((i) => supportedEncodings.includes(i.trim()))
                .join(", ")
                .trim();

              if (encodings.length) {
                shouldCompress = true;

                _headers += `Content-Encoding: ${encodings}${CRLF}`;
              }
              break;
            }
            default: {
              _headers += `${item.value}: ${item.value}${CRLF}`;
              break;
            }
          }
        },
      );
    }

    if (shouldCompress) {
      _body = new Uint8Array(gzipSync(new TextEncoder().encode(body)));
      _headers += `Content-Length: ${_body.length}${CRLF}`;
    } else if (contentLength !== undefined)
      _headers += `Content-Length: ${_body.length}${CRLF}`;

    _headers += CRLF;

    return {
      headers: _headers,
      body: _body,
    };
  }
}
