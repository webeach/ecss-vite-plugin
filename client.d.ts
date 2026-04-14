declare module '*.ecss' {
  const styles: Record<
    string,
    (...args: any[]) => Record<string, string | undefined>
  > & {
    merge: (
      ...objects: Record<string, string | undefined>[]
    ) => Record<string, string | undefined>;
  };
  export default styles;
}
