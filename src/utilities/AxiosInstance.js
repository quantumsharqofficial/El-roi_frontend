import axios from "axios";

const baseURL = "https://elroi.qsisphysio.com/api/api";

const AxiosInstance = axios.create({ baseURL });
export default AxiosInstance;

// import axios from "axios";

// const baseURL =
//   import.meta.env.VITE_API_BASE_URL ||
//   (window.location.hostname === "localhost" ||
//   window.location.hostname === "127.0.0.1"
//     ? "http://localhost:5205/api"
//     : "https://elroi.qsisphysio.com/api/api");

// const AxiosInstance = axios.create({ baseURL });

// export default AxiosInstance;
