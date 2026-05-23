import * as XLSX from "xlsx";

export type Column<T> = {
  header: string;
  /** key in the row or function returning the value */
  accessor: keyof T | ((row: T) => unknown);
  width?: number;
};

export function exportToExcel<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: Column<T>[],
  sheetName = "Relatório",
) {
  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col) => {
      const value =
        typeof col.accessor === "function"
          ? col.accessor(row)
          : row[col.accessor];
      obj[col.header] = value ?? "";
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: columns.map((c) => c.header),
  });

  worksheet["!cols"] = columns.map((c) => ({ wch: c.width ?? 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const safeName = filename.replace(/[^a-zA-Z0-9-_]+/g, "_");
  XLSX.writeFile(workbook, `${safeName}.xlsx`);
}
