import { serve, Server } from "./deps.ts";

type Method = "POST" | "GET" | "PUT" | "PATCH" | "DELETE";

type PartialRecord<K extends string | number | symbol, T> = { [P in K]?: T };

type All =
  | number
  | string
  | Array<All>
  | Record<string | number, string | number>;

interface Request {
  method: string;
  url: string;
}

interface Response {
  status: (stat: number) => void;
  send: (string: string) => void;
  json: (json: All) => void;
}

type Handler = (req: Request, res: Response) => void;

export class App {
  routing: Record<string, PartialRecord<Method, Handler>> = {};
  server!: Server;

  constructor(port: number) {
    this.server = serve(`0.0.0.0:${port}`);
    console.log(`Server started on port ${port}`);
    return this;
  }

  async listen() {
    for await (const req of this.server) {
      const { url, method } = req;
      if (!(url in this.routing)) {
        req.respond({ body: "Not Found" });
        continue;
      }

      if (!(method in this.routing[url])) {
        req.respond({ body: `Cannot ${method} at ${url}` });
        continue;
      }

      this.routing[url][method as Method]!(
        {
          url,
          method,
        },
        {
          send: (str) => {
            req.respond({ body: str });
          },
          json: (json) => {
            req.respond({ body: JSON.stringify(json) });
          },
          status: (stat) => {
            req.respond({ status: stat });
          },
        }
      );
    }
  }

  at(path: string) {
    this.routing[path] = {};
    return {
      on: (method: Method, handler: Handler) => {
        return this.on(path, method, handler);
      },
    };
  }

  on(path: string, method: Method, handler: Handler) {
    if (this.routing[path]) {
      this.routing[path][method] = handler;
    }
    return {
      on: (method: Method, handler: Handler) => {
        return this.on(path, method, handler);
      },
    };
  }
}
