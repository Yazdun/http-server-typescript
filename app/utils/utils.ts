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

  generateResponse(options: ResponseOptions): string {
    const { status, contentType, contentLength, body = "", headers } = options;
    let response = `HTTP/1.1 ${status} ${statusMessages[status]}${CRLF}`;

    if (contentType) response += `Content-Type: ${contentType}${CRLF}`;

    if (contentLength !== undefined) {
      response += `Content-Length: ${contentLength}${CRLF}`;
    }
    if (headers) {
      Array.from(headers, ([header, value]) => ({ header, value })).forEach(
        (item) => {
          switch (item.header) {
            case "Accept-Encoding": {
              if (supportedEncodings.includes(item.value))
                response += `Content-Encoding: ${item.value}${CRLF}`;
              break;
            }
            default: {
              response += `${item.value}: ${item.value}${CRLF}`;
              break;
            }
          }
        },
      );
    }
    response += CRLF;

    if (body) response += body;

    return response;
  }
}
