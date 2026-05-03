import Papa from "papaparse";

export const loadCSV = (file, setData) => {
  Papa.parse(file, {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: (result) => {
      setData(result.data);
    },
  });
};