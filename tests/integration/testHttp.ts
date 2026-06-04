import http from "node:http";
import type express from "express";

export type TestResponse = {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: unknown;
  text: string;
};

export function request(
  app: express.Express,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to bind test server."));
        return;
      }

      const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
      const req = http.request(
        {
          host: "127.0.0.1",
          port: address.port,
          path,
          method: options.method || "GET",
          headers: {
            ...(payload ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload).toString() } : {}),
            ...options.headers,
          },
        },
        (response) => {
          let raw = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            raw += chunk;
          });
          response.on("end", () => {
            server.close();
            resolve({
              status: response.statusCode || 0,
              headers: response.headers,
              text: raw,
              body: parseBody(raw),
            });
          });
        },
      );

      req.on("error", (error) => {
        server.close();
        reject(error);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  });
}

function parseBody(raw: string): unknown {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
