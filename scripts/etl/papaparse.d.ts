// Minimal declarations for `papaparse` 5.7.0 (the package ships no types of its own).
// Chosen over `@types/papaparse` to avoid adding a dependency; only the API used by the ETL is declared.
declare module "papaparse" {
  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row?: number;
  }

  export interface ParseMeta {
    fields?: string[];
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
  }

  export interface ParseStepResult<T> {
    data: T;
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface ParseConfig<T> {
    header?: boolean;
    delimiter?: string;
    skipEmptyLines?: boolean | "greedy";
    dynamicTyping?: boolean;
    step?: (results: ParseStepResult<T>) => void;
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export function parse<T = Record<string, string>>(input: string, config: ParseConfig<T>): ParseResult<T>;

  const Papa: { parse: typeof parse };
  export default Papa;
}
